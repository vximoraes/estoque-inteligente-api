#!/usr/bin/env bash
# PreToolUse hook para o tool Bash: bloqueia comandos destrutivos óbvios
# antes de chegar no shell. Não substitui julgamento — só pega o caso
# claramente perigoso (rm -rf solto, force-push, reset --hard, drop de banco etc).

set -euo pipefail

input="$(cat)"

command="$(printf '%s' "$input" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
")"

if [ -z "$command" ]; then
  exit 0
fi

deny() {
  echo "Bloqueado pelo hook validate-bash.sh: $1" >&2
  exit 2
}

case "$command" in
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf ."*|*"rm -fr /"*)
    deny "rm -rf em caminho amplo demais. Rode manualmente se for mesmo isso."
    ;;
  *"git push --force"*|*"git push -f "*|*"git push -f\"*"*)
    deny "force-push. Confirme com o usuário antes."
    ;;
  *"git reset --hard"*)
    deny "git reset --hard descarta trabalho não commitado. Confirme com o usuário antes."
    ;;
  *"git clean -f"*|*"git clean -fd"*|*"git clean -fdx"*)
    deny "git clean -f remove arquivos não versionados sem volta. Confirme com o usuário antes."
    ;;
  *"chmod -R 777"*)
    deny "chmod -R 777 é permissão perigosa demais para uso normal."
    ;;
  *"DROP TABLE"*|*"DROP DATABASE"*|*"drop table"*|*"drop database"*|*"dropDatabase"*|*"db.dropDatabase"*)
    deny "DROP/dropDatabase no MongoDB. Isso não deveria rodar via agente sem confirmação explícita."
    ;;
  *"docker compose down -v"*|*"docker-compose down -v"*)
    deny "remove os volumes do Mongo/MinIO locais. Confirme com o usuário antes."
    ;;
  *"git branch -D "*)
    deny "delete forçado de branch. Confirme com o usuário antes."
    ;;
esac

exit 0
