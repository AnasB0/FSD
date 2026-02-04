"""Configuration module for the Geocoding service."""

import os
from typing import Optional


class Config:
    """Application configuration class."""

    GEOCODING_PORT: int = int(os.getenv("GEOCODING_PORT", "5002"))
    NOMINATIM_BASE_URL: str = os.getenv(
        "NOMINATIM_BASE_URL", "https://nominatim.openstreetmap.org"
    )
    GEOCODING_TIMEOUT_SECONDS: int = int(os.getenv("GEOCODING_TIMEOUT_SECONDS", "10"))
    DEFAULT_COUNTRY: str = os.getenv("DEFAULT_COUNTRY", "SA")
    DEFAULT_CITY: str = os.getenv("DEFAULT_CITY", "Riyadh")
    USER_AGENT: str = "NajahDeliveryOS/1.0"


def get_config() -> Config:
    """Get configuration instance.
    
    Returns:
        Config: Configuration object with loaded settings.
    """
    return Config()
