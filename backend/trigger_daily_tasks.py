#!/usr/bin/env python3
"""
Script to manually trigger daily task generation for all users.
This can be used for testing or to manually generate tasks without waiting for the scheduled cron job.

Usage:
    python trigger_daily_tasks.py
    
    Or from the backend directory:
    python -m trigger_daily_tasks
"""

import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Add the parent directory to the path so we can import app modules
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import connect_to_mongo, close_mongo_connection
from app.services.cron_service import generate_daily_tasks
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main function to trigger daily task generation"""
    try:
        logger.info("Starting manual daily task generation...")
        
        # Connect to MongoDB
        logger.info("Connecting to MongoDB...")
        await connect_to_mongo()
        logger.info("Connected to MongoDB successfully")
        
        # Generate daily tasks for all users
        logger.info("Generating daily tasks for all active users...")
        await generate_daily_tasks()
        
        logger.info("Daily task generation completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during daily task generation: {e}", exc_info=True)
        sys.exit(1)
    finally:
        # Close MongoDB connection
        logger.info("Closing MongoDB connection...")
        await close_mongo_connection()
        logger.info("MongoDB connection closed")


if __name__ == "__main__":
    asyncio.run(main())
