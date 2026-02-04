"""
Configuration module for the Optimizer service.
Loads and validates environment variables.
"""
import os
from typing import Optional


class Config:
    """Configuration class for optimizer service."""
    
    OSRM_BASE_URL: str = os.getenv('OSRM_BASE_URL', 'http://router.project-osrm.org')
    MAX_ORDERS_PER_ROUTE: int = int(os.getenv('MAX_ORDERS_PER_ROUTE', '10'))
    MAX_ROUTE_DURATION_HOURS: float = float(os.getenv('MAX_ROUTE_DURATION_HOURS', '8'))
    DEFAULT_SERVICE_TIME_MINUTES: int = int(os.getenv('DEFAULT_SERVICE_TIME_MINUTES', '5'))
    OPTIMIZER_PORT: int = int(os.getenv('OPTIMIZER_PORT', '5001'))
    
    @classmethod
    def validate(cls) -> bool:
        """
        Validate configuration values.
        
        Returns:
            bool: True if configuration is valid
        """
        if cls.MAX_ORDERS_PER_ROUTE <= 0:
            raise ValueError("MAX_ORDERS_PER_ROUTE must be positive")
        if cls.MAX_ROUTE_DURATION_HOURS <= 0:
            raise ValueError("MAX_ROUTE_DURATION_HOURS must be positive")
        if cls.DEFAULT_SERVICE_TIME_MINUTES < 0:
            raise ValueError("DEFAULT_SERVICE_TIME_MINUTES must be non-negative")
        return True
