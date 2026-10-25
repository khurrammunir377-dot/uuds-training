"""
UUDS Aviation Training Compliance Tracker - Direct WhatsApp Gateway Service
Powered by neonize / whatsmeow (native WhatsApp Multi-Device protocol).
Allows silent dispatch of compliance notifications without opening new browser tabs or external windows.
"""

import os
import sys
import threading
import time
import segno
import logging
from typing import Optional, Dict, Any

from neonize.client import NewClient
from neonize.events import QREv, ConnectedEv, LoggedOutEv, DisconnectedEv
from neonize.utils.jid import build_jid

logger = logging.getLogger("whatsapp_service")

class WhatsAppService:
    def __init__(self):
        self.backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.session_db = os.path.join(self.backend_dir, "whatsapp_session.db")
        
        self.client: Optional[NewClient] = None
        self.thread: Optional[threading.Thread] = None
        
        self.status = "disconnected" # "disconnected", "pairing", "connected", "error"
        self.qr_code_raw: Optional[bytes] = None
        self.qr_code_data_uri: Optional[str] = None
        self.phone_number: Optional[str] = None
        self.push_name: Optional[str] = None
        self.last_error: Optional[str] = None
        self.is_starting = False
        self._lock = threading.Lock()

    def get_status(self) -> Dict[str, Any]:
        """Returns the current connection state and QR data for the frontend modal."""
        with self._lock:
            # Check client active properties if available
            is_logged_in = False
            is_connected = False
            if self.client:
                try:
                    is_logged_in = bool(self.client.is_logged_in)
                    is_connected = bool(self.client.is_connected)
                except Exception:
                    pass

            if is_logged_in and is_connected:
                current_status = "connected"
            elif self.qr_code_data_uri:
                current_status = "pairing"
            elif self.is_starting:
                current_status = "starting"
            else:
                current_status = self.status

            return {
                "status": current_status,
                "is_logged_in": is_logged_in,
                "is_connected": is_connected,
                "qr_code": self.qr_code_data_uri if current_status == "pairing" else None,
                "phone_number": self.phone_number,
                "push_name": self.push_name,
                "error": self.last_error
            }

    def _on_qr(self, client: NewClient, qr_data: bytes):
        """Triggered when WhatsApp issues a new pairing QR code."""
        with self._lock:
            self.qr_code_raw = qr_data
            try:
                # Generate high-contrast PNG data URI using segno
                qr = segno.make_qr(qr_data)
                self.qr_code_data_uri = qr.png_data_uri(scale=6, border=2)
                self.status = "pairing"
                self.last_error = None
                print("⚡ [WhatsApp Service] New pairing QR generated successfully.")
            except Exception as e:
                self.last_error = f"QR generation error: {e}"
                print(f"❌ [WhatsApp Service] Error creating QR image: {e}")

    def _on_connected(self, client: NewClient, message: ConnectedEv):
        """Triggered upon successful WhatsApp connection and login."""
        with self._lock:
            self.status = "connected"
            self.qr_code_data_uri = None
            self.qr_code_raw = None
            self.last_error = None
            
            try:
                me = client.get_me()
                if me:
                    if hasattr(me, "JID") and me.JID and me.JID.User:
                        self.phone_number = me.JID.User
                    if hasattr(me, "PushName") and me.PushName:
                        self.push_name = me.PushName
            except Exception as e:
                print(f"⚠️ [WhatsApp Service] Note on get_me(): {e}")

            print(f"✅ [WhatsApp Service] WhatsApp is CONNECTED and ready! Logged in as: {self.phone_number or 'Authenticated User'}")

    def _on_disconnected(self, client: NewClient, message: DisconnectedEv):
        with self._lock:
            if self.status == "connected":
                self.status = "disconnected"
            print("ℹ️ [WhatsApp Service] WhatsApp client disconnected.")

    def _on_logged_out(self, client: NewClient, message: LoggedOutEv):
        with self._lock:
            self.status = "disconnected"
            self.qr_code_data_uri = None
            self.phone_number = None
            self.push_name = None
            print("🚪 [WhatsApp Service] WhatsApp session logged out.")

    def start(self):
        """Initializes client and launches the connection loop in a background daemon thread."""
        with self._lock:
            if self.thread and self.thread.is_alive():
                return
            self.is_starting = True
            self.last_error = None

        def run_loop():
            try:
                print(f"🚀 [WhatsApp Service] Initializing neonize client (session: {self.session_db})...")
                self.client = NewClient(self.session_db)
                
                # Register event callbacks
                self.client.event.qr(self._on_qr)
                self.client.event(ConnectedEv)(self._on_connected)
                self.client.event(DisconnectedEv)(self._on_disconnected)
                self.client.event(LoggedOutEv)(self._on_logged_out)

                with self._lock:
                    self.is_starting = False

                # connect() blocks until disconnected or stopped
                self.client.connect()
            except Exception as e:
                with self._lock:
                    self.status = "error"
                    self.last_error = str(e)
                    self.is_starting = False
                print(f"❌ [WhatsApp Service] Client loop error: {e}")

        self.thread = threading.Thread(target=run_loop, name="WhatsAppClientThread", daemon=True)
        self.thread.start()

    def send_silent_message(self, phone: str, text: str) -> Dict[str, Any]:
        """
        Sends a WhatsApp message silently via the connected session.
        No browser windows or tabs are opened.
        """
        if not self.client:
            raise RuntimeError("WhatsApp engine is not initialized. Please connect first.")

        try:
            if not self.client.is_connected or not self.client.is_logged_in:
                raise RuntimeError("WhatsApp is not connected. Please scan the QR code to sign in.")
        except RuntimeError:
            raise
        except Exception as e:
            pass

        # Normalize phone number
        clean_phone = "".join(filter(str.isdigit, str(phone)))
        if clean_phone.startswith("0"):
            clean_phone = "971" + clean_phone[1:]
        elif len(clean_phone) == 9:
            clean_phone = "971" + clean_phone

        if not clean_phone or len(clean_phone) < 8:
            raise ValueError(f"Invalid phone number provided: '{phone}'")

        jid = build_jid(clean_phone, "s.whatsapp.net")
        
        print(f"📤 [WhatsApp Service] Sending silent compliance message to {clean_phone}...")
        resp = self.client.send_message(jid, text)
        print(f"✅ [WhatsApp Service] Message successfully dispatched to {clean_phone}!")
        
        return {
            "success": True,
            "recipient": clean_phone,
            "timestamp": time.time()
        }

    def logout(self) -> Dict[str, Any]:
        """Logs out and cleans up session."""
        with self._lock:
            if self.client:
                try:
                    self.client.logout()
                except Exception as e:
                    print(f"Warning during client logout: {e}")
                try:
                    self.client.disconnect()
                except Exception:
                    pass
            self.status = "disconnected"
            self.qr_code_data_uri = None
            self.phone_number = None
            self.push_name = None
            self.client = None

        # Re-start to generate fresh QR code for next login
        self.start()
        return {"success": True, "message": "Logged out successfully"}

# Global singleton
whatsapp_service = WhatsAppService()
