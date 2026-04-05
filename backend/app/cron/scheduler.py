from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.settings.get_env import CRON_TIMEZONE
from app.services.cron_service import generate_daily_tasks
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def start_scheduler():
    """Start the APScheduler with daily task generation job"""
    try:
        # Schedule daily task generation at 01:00 AM IST
        scheduler.add_job(
            generate_daily_tasks,
            trigger=CronTrigger(hour=1, minute=0, timezone=CRON_TIMEZONE),
            id="generate_daily_tasks",
            name="Generate Daily Tasks",
            replace_existing=True
        )
        
        scheduler.start()
        logger.info(f"Scheduler started. Daily tasks will be generated at 01:00 {CRON_TIMEZONE}")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        raise

def shutdown_scheduler():
    """Shutdown the scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
