"""
BLS Quarterly Census of Employment and Wages (QCEW) Ingestion

Placeholder for QCEW data integration.
"""
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    logger.info("QCEW ingestion not yet implemented")
    # TODO: Implement BLS QCEW data fetch
    # API: https://www.bls.gov/cew/downloadable-data-files.htm


if __name__ == "__main__":
    main()
