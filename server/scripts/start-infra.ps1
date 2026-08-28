# Start Docker Engine in WSL and bring up Postgres + Redis.
$ErrorActionPreference = "Stop"
wsl -d Ubuntu-24.04 -u root -- bash -lc "sed -i 's/\r$//' /mnt/d/InterviewAI/Prasanna/server/scripts/start-infra.sh; bash /mnt/d/InterviewAI/Prasanna/server/scripts/start-infra.sh"
