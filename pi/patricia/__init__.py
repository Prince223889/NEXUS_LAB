"""Patricia — assistante du laboratoire NEXUS (Raspberry Pi 4).

Modules :
  memory    mémoire durable (SQLite + FTS5) : conversations, notes, projets, préférences, suivis
  knowledge base de connaissances hors ligne (catalogue, pannes connues, conseils)
  diagnose  lecture des journaux de compilation et du moniteur série, vérification après flash
  intents   compréhension du français sans IA (règles), pour fonctionner hors ligne
  llm       IA locale (Ollama) ou distante compatible OpenAI, avec appel d'outils
  tools     outils que Patricia peut utiliser ; les actions matérielles exigent une confirmation
  fleet     superviseur de flotte de véhicules : réservation de zones, anticollision, arrêt d'urgence
  voice     reconnaissance (Vosk) et synthèse vocale (Piper) hors ligne, si installées
  engine    orchestration d'une conversation
  api       routes HTTP branchées dans nexus_agent.py
"""
VERSION = "1.0.0"
NAME = "Patricia"
