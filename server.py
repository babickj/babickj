"""
FireCommand AI — Forest Fire Command Center
Backend server connecting field tablets, command center, and LLM on port 8001.
"""

import asyncio
import json
import math
import random
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="FireCommand AI")

# ── LLM Config ─────────────────────────────────────────────────────────────
LLM_BASE = "http://localhost:8001"

# ── Shared state ────────────────────────────────────────────────────────────
state = {
    "incident": "WILDFIRE ALPHA-7",
    "location": "Cascade Ridge, CA",
    "started": "06:42 PST",
    "tick": 0,
    # Fire metrics
    "acres_burned": 847,
    "containment_pct": 12,
    "fire_perimeter": 14.2,
    "rate_of_spread": "MODERATE",
    # Weather
    "wind_speed": 18,
    "wind_dir": "NW",
    "wind_gust": 24,
    "humidity": 14,
    "temperature": 94,
    "red_flag": True,
    # Resources
    "ground_units": 23,
    "aircraft": 4,
    "dozers": 6,
    "water_tenders": 8,
    # Infrastructure
    "water_main_break": False,
    "road_closures": ["Hwy 36 N", "Forest Rd 12"],
    "evac_zones": ["Zone A — MANDATORY", "Zone B — WARNING"],
    "structures_threatened": 342,
    "structures_destroyed": 14,
    # Dynamic hotspots  [x%, y%, intensity 0-1]
    "hotspots": [
        {"id": "H1", "x": 38, "y": 44, "intensity": 0.9, "label": "Primary Head"},
        {"id": "H2", "x": 55, "y": 38, "intensity": 0.7, "label": "Spot Fire"},
        {"id": "H3", "x": 30, "y": 60, "intensity": 0.5, "label": "Flank"},
    ],
    # Field units [id, x%, y%, status, assignment]
    "units": [
        {"id": "E-14", "x": 45, "y": 55, "type": "engine", "status": "ACTIVE", "task": "Structure defense"},
        {"id": "E-22", "x": 33, "y": 48, "type": "engine", "status": "ACTIVE", "task": "Line construction"},
        {"id": "D-3",  "x": 28, "y": 52, "type": "dozer",  "status": "ACTIVE", "task": "Firebreak"},
        {"id": "H-1",  "x": 50, "y": 35, "type": "heli",   "status": "ACTIVE", "task": "Water drop NE flank"},
        {"id": "H-2",  "x": 42, "y": 30, "type": "heli",   "status": "ACTIVE", "task": "Recon"},
        {"id": "T-7",  "x": 60, "y": 58, "type": "tender", "status": "STANDBY", "task": "Water supply"},
        {"id": "IC",   "x": 70, "y": 70, "type": "command","status": "COMMAND", "task": "Incident command"},
    ],
    # Recent events
    "events": [
        {"time": "09:14", "severity": "CRITICAL", "msg": "Wind shift detected — NW 24 mph gusts"},
        {"time": "09:08", "severity": "HIGH",     "msg": "Spot fire confirmed east of Camp Creek Rd"},
        {"time": "08:55", "severity": "HIGH",     "msg": "Zone A evacuation order issued"},
        {"time": "08:41", "severity": "MEDIUM",   "msg": "Air tanker 447 assigned to primary head"},
        {"time": "08:30", "severity": "INFO",     "msg": "Dozer line 60% complete on south flank"},
    ],
    # AI recommendation
    "ai_recommendation": "",
    "ai_thinking": False,
    "last_ai_update": 0,
    # Tablets connected
    "tablets": {},
}

connected_dashboards: list[WebSocket] = []
connected_tablets: dict[str, WebSocket] = {}
ai_lock = asyncio.Lock()


# ── Simulation ───────────────────────────────────────────────────────────────

def simulate_tick():
    """Advance the fire simulation by one tick."""
    s = state
    s["tick"] += 1
    t = s["tick"]

    # Slowly grow fire
    s["acres_burned"] += random.randint(8, 25)
    s["fire_perimeter"] = round(s["fire_perimeter"] + random.uniform(0.1, 0.4), 1)

    # Containment drifts based on resources vs spread
    delta = random.uniform(-0.5, 1.2)
    s["containment_pct"] = max(0, min(95, round(s["containment_pct"] + delta, 1)))

    # Wind fluctuation
    s["wind_speed"] = max(5, min(45, s["wind_speed"] + random.randint(-3, 4)))
    s["wind_gust"] = s["wind_speed"] + random.randint(3, 10)
    s["humidity"] = max(8, min(40, s["humidity"] + random.randint(-2, 2)))
    s["temperature"] = max(80, min(108, s["temperature"] + random.randint(-1, 2)))
    s["red_flag"] = s["wind_speed"] > 15 and s["humidity"] < 20

    # Occasional wind direction shift (dramatic for demo)
    if t % 20 == 0:
        dirs = ["N", "NE", "NW", "W", "SW"]
        s["wind_dir"] = random.choice(dirs)
        sev = "CRITICAL" if s["wind_speed"] > 25 else "HIGH"
        _add_event(sev, f"Wind shift — now {s['wind_dir']} at {s['wind_speed']} mph")

    # Water main break event
    if t == 15:
        s["water_main_break"] = True
        _add_event("CRITICAL", "Water main break reported — Forest Service Rd 8 hydrants offline")
    if t == 35:
        s["water_main_break"] = False
        _add_event("INFO", "Water main restored — hydrants back online")

    # New spot fire
    if t % 18 == 0:
        nx = random.randint(25, 70)
        ny = random.randint(25, 65)
        hid = f"H{len(s['hotspots'])+1}"
        s["hotspots"].append({"id": hid, "x": nx, "y": ny, "intensity": round(random.uniform(0.3, 0.8), 2), "label": "New spot fire"})
        _add_event("HIGH", f"New spot fire detected at grid {nx//10}{ny//10} — aerial assets requested")

    # Move units slightly
    for u in s["units"]:
        if u["status"] == "ACTIVE":
            u["x"] = max(5, min(95, u["x"] + random.randint(-1, 1)))
            u["y"] = max(5, min(95, u["y"] + random.randint(-1, 1)))

    # Rate of spread
    if s["wind_speed"] > 30:
        s["rate_of_spread"] = "EXTREME"
    elif s["wind_speed"] > 20:
        s["rate_of_spread"] = "HIGH"
    elif s["wind_speed"] > 12:
        s["rate_of_spread"] = "MODERATE"
    else:
        s["rate_of_spread"] = "LOW"

    s["structures_threatened"] = max(0, s["structures_threatened"] + random.randint(-5, 8))
    if random.random() < 0.05:
        s["structures_destroyed"] += 1
        _add_event("CRITICAL", f"Structure loss confirmed — total now {s['structures_destroyed']}")


def _add_event(severity: str, msg: str):
    now = datetime.now().strftime("%H:%M")
    state["events"].insert(0, {"time": now, "severity": severity, "msg": msg})
    state["events"] = state["events"][:30]  # keep last 30


# ── LLM Integration ──────────────────────────────────────────────────────────

async def get_ai_recommendation() -> str:
    s = state
    prompt = f"""You are the AI tactical advisor for wildfire incident command.
Current situation — {s['incident']} at {s['location']}:

FIRE STATUS:
- Acres burned: {s['acres_burned']:,}
- Containment: {s['containment_pct']}%
- Rate of spread: {s['rate_of_spread']}
- Perimeter: {s['fire_perimeter']} miles

WEATHER (RED FLAG: {'YES ⚠' if s['red_flag'] else 'NO'}):
- Wind: {s['wind_speed']} mph gusts to {s['wind_gust']} mph from {s['wind_dir']}
- Humidity: {s['humidity']}%
- Temperature: {s['temperature']}°F

INFRASTRUCTURE:
- Water main break: {'YES — reduced suppression capacity' if s['water_main_break'] else 'No'}
- Road closures: {', '.join(s['road_closures'])}
- Evacuation zones: {', '.join(s['evac_zones'])}
- Structures threatened: {s['structures_threatened']}

ACTIVE HOTSPOTS: {len(s['hotspots'])} — {', '.join(h['label'] for h in s['hotspots'])}

RESOURCES: {s['ground_units']} ground units, {s['aircraft']} aircraft, {s['dozers']} dozers, {s['water_tenders']} water tenders

Provide 3 specific, urgent tactical recommendations for the next 30 minutes. Be direct and actionable. Format as numbered list. Each recommendation should reference specific units or locations. Max 120 words total."""

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{LLM_BASE}/v1/chat/completions",
                json={
                    "model": "default",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 200,
                    "temperature": 0.4,
                    "stream": False,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        # Fallback recommendations if LLM unreachable
        fallbacks = [
            f"1. IMMEDIATE: Redirect H-1 and H-2 to suppress new spot fire — wind shift to {s['wind_dir']} creates extreme spotting risk.\n2. PRIORITY: Pull E-14 back 200m — structure defense untenable with {s['wind_speed']}mph winds and {s['humidity']}% RH.\n3. CRITICAL: Pre-position water tenders on Forest Rd 14 before road closure — {s['wind_gust']}mph gust potential.",
            f"1. WIND SHIFT RESPONSE: All air resources pivot to NE flank immediately — {s['wind_dir']} shift will drive fire toward Zone B.\n2. DOZER: Complete D-3 firebreak at grid 3052 before 14:00 — only viable anchor point remaining.\n3. EVACUATION: Expand Zone B to mandatory — structures at risk doubles with current ROS.",
        ]
        return random.choice(fallbacks)


async def get_tablet_recommendation(unit_id: str, lat: float, lon: float, conditions: dict) -> str:
    s = state
    unit = next((u for u in s["units"] if u["id"] == unit_id), None)
    assignment = unit["task"] if unit else "patrol"

    prompt = f"""You are an AI advisor for field firefighter {unit_id} during wildfire {s['incident']}.

Their location: grid {int(lat)},{int(lon)} — current assignment: {assignment}

LOCAL CONDITIONS:
- Wind: {s['wind_speed']} mph from {s['wind_dir']} (gusting {s['wind_gust']})
- Humidity: {s['humidity']}% | Temp: {s['temperature']}°F
- Water main break nearby: {'YES' if s['water_main_break'] else 'No'}
- Rate of spread: {s['rate_of_spread']}
- Nearest hotspot: {s['hotspots'][0]['label'] if s['hotspots'] else 'None reported'}

Give this firefighter 2 immediate safety/tactical actions. Be direct — they are in the field. Under 60 words."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{LLM_BASE}/v1/chat/completions",
                json={
                    "model": "default",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 100,
                    "temperature": 0.3,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        actions = [
            f"1. WIND SHIFT: Identify escape route NOW — {s['wind_dir']} shift at {s['wind_speed']}mph means your safety zone may be compromised.\n2. Report structure conditions on your flank to IC before advancing.",
            f"1. WITHDRAW to black — {s['rate_of_spread']} spread rate with low humidity ({s['humidity']}%) makes current position untenable.\n2. Coordinate with D-3 on your firebreak anchor before wind gusts exceed {s['wind_gust']}mph.",
        ]
        return random.choice(actions)


# ── Background tasks ─────────────────────────────────────────────────────────

async def simulation_loop():
    """Run simulation and broadcast state every 5 seconds."""
    while True:
        await asyncio.sleep(5)
        simulate_tick()
        payload = json.dumps({"type": "state", "data": state_snapshot()})
        # Broadcast to command center dashboards
        dead = []
        for ws in connected_dashboards:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            connected_dashboards.remove(ws)
        # Broadcast to tablets
        dead_tabs = []
        for tid, ws in connected_tablets.items():
            try:
                await ws.send_text(payload)
            except Exception:
                dead_tabs.append(tid)
        for tid in dead_tabs:
            connected_tablets.pop(tid, None)


async def ai_recommendation_loop():
    """Refresh AI recommendation every 30 seconds."""
    await asyncio.sleep(3)  # initial delay
    while True:
        async with ai_lock:
            state["ai_thinking"] = True
        rec = await get_ai_recommendation()
        async with ai_lock:
            state["ai_recommendation"] = rec
            state["ai_thinking"] = False
            state["last_ai_update"] = int(time.time())
        # Push AI update to all connected clients
        payload = json.dumps({"type": "ai", "recommendation": rec})
        for ws in connected_dashboards:
            try:
                await ws.send_text(payload)
            except Exception:
                pass
        await asyncio.sleep(30)


def state_snapshot() -> dict:
    s = state.copy()
    s["events"] = state["events"][:10]
    return s


@app.on_event("startup")
async def startup():
    asyncio.create_task(simulation_loop())
    asyncio.create_task(ai_recommendation_loop())


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def command_center():
    return FileResponse(Path(__file__).parent / "index.html")


@app.get("/tablet")
async def tablet_view():
    return FileResponse(Path(__file__).parent / "tablet.html")


@app.get("/api/state")
async def api_state():
    return state_snapshot()


@app.post("/api/chat")
async def chat(body: dict):
    """General LLM chat with fire state injected as system context."""
    messages = body.get("messages", [])
    s = state
    system = f"""You are FireCommand AI, an intelligent assistant embedded in a wildfire incident command center.

Current incident: {s['incident']} at {s['location']}
Fire status: {s['acres_burned']:,} acres burned, {s['containment_pct']}% contained, {s['rate_of_spread']} rate of spread
Weather: Wind {s['wind_speed']} mph (gusts {s['wind_gust']}) from {s['wind_dir']}, {s['humidity']}% RH, {s['temperature']}°F
Resources: {s['ground_units']} ground units, {s['aircraft']} aircraft, {s['dozers']} dozers, {s['water_tenders']} water tenders
Infrastructure: Water main break: {'YES' if s['water_main_break'] else 'No'} | Roads closed: {', '.join(s['road_closures'])}
Active hotspots: {', '.join(h['label'] for h in s['hotspots'])}

Answer questions concisely. When asked for recommendations or analysis, reference the live data above."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{LLM_BASE}/v1/chat/completions",
                json={
                    "model": "default",
                    "messages": [{"role": "system", "content": system}] + messages,
                    "max_tokens": 400,
                    "temperature": 0.5,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data["choices"][0]["message"]["content"].strip()
            return {"reply": reply}
    except Exception as e:
        return {"reply": f"[LLM unavailable — check port 8001] Error: {str(e)[:80]}"}


@app.post("/api/tablet/recommend")
async def tablet_recommend(body: dict):
    unit_id = body.get("unit_id", "FIELD")
    lat = body.get("lat", 50.0)
    lon = body.get("lon", 50.0)
    conditions = body.get("conditions", {})
    rec = await get_tablet_recommendation(unit_id, lat, lon, conditions)
    return {"recommendation": rec}


@app.websocket("/ws/dashboard")
async def dashboard_ws(ws: WebSocket):
    await ws.accept()
    connected_dashboards.append(ws)
    # Send initial state
    await ws.send_text(json.dumps({"type": "state", "data": state_snapshot()}))
    if state["ai_recommendation"]:
        await ws.send_text(json.dumps({"type": "ai", "recommendation": state["ai_recommendation"]}))
    try:
        while True:
            await ws.receive_text()  # keep alive
    except WebSocketDisconnect:
        if ws in connected_dashboards:
            connected_dashboards.remove(ws)


@app.websocket("/ws/tablet/{unit_id}")
async def tablet_ws(ws: WebSocket, unit_id: str):
    await ws.accept()
    connected_tablets[unit_id] = ws
    state["tablets"][unit_id] = {"connected": True, "last_seen": datetime.now().isoformat()}
    _add_event("INFO", f"Tablet {unit_id} connected to command net")
    await ws.send_text(json.dumps({"type": "state", "data": state_snapshot()}))
    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("type") == "location":
                state["tablets"][unit_id] = {
                    "connected": True,
                    "last_seen": datetime.now().isoformat(),
                    "lat": data.get("lat"),
                    "lon": data.get("lon"),
                }
    except WebSocketDisconnect:
        connected_tablets.pop(unit_id, None)
        state["tablets"][unit_id] = {"connected": False}
        _add_event("INFO", f"Tablet {unit_id} disconnected")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8080, reload=False)
