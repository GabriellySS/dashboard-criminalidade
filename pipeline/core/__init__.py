"""
pipeline/core — Contratos abstratos do pipeline de dados.

Qualquer adaptador (scraper de estado) DEVE herdar de BaseScraper
e implementar os métodos abstratos definidos aqui.
"""
from pipeline.core.base_scraper import BaseScraper

__all__ = ["BaseScraper"]
