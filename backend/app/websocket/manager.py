import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("agrishield.websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.farmer_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            if user_id not in self.farmer_connections:
                self.farmer_connections[user_id] = []
            self.farmer_connections[user_id].append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: int = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.farmer_connections:
            if websocket in self.farmer_connections[user_id]:
                self.farmer_connections[user_id].remove(websocket)
        logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        data = json.dumps(message)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

    async def send_to_user(self, user_id: int, message: Dict[str, Any]):
        data = json.dumps(message)
        if user_id in self.farmer_connections:
            for connection in self.farmer_connections[user_id]:
                try:
                    await connection.send_text(data)
                except Exception:
                    pass

ws_manager = ConnectionManager()
