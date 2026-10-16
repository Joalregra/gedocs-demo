#!/usr/bin/env bash
# Busca rastros de la institución y datos sensibles en la copia de la demo.
# Uso:   bash buscar-rastros.sh [carpeta]
# Extra: EXTRA_TERMS="Centro de Procesos|gedocs.midominio.com|Juan Perez" bash buscar-rastros.sh
#        EXCLUDE_FILES="README.md" excluye archivos por nombre (solo con una razón consciente)
# Sale con código 1 si encuentra rastros institucionales (sirve como verificación final o en CI).

set -uo pipefail
ROOT="${1:-.}"
REPORT="reporte-rastros.txt"

INSTITUTION='\bsena\b|misena|sena\.edu|servicio nacional de aprendizaje|sofia ?plus|territorium|zajuna|centro de (formaci[oó]n|servicios|gesti[oó]n|procesos)|\bregional\b|\baprendic?(z|es)\b|\binstructor(a|es)?\b|\bficha\b|programa de formaci[oó]n|\bnit\b'
if [[ -n "${EXTRA_TERMS:-}" ]]; then INSTITUTION="${INSTITUTION}|${EXTRA_TERMS}"; fi

EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
PHONE='\b(\+?57[ -]?)?3[0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{4}\b'
IPV4='\b([0-9]{1,3}\.){3}[0-9]{1,3}\b'
SECRET='(password|passwd|secret|api[_-]?key|token|app_key|db_password|private key|bearer)[^\n]{0,3}[:=]'

GREP_OPTS=(-rniIE --color=never
  --exclude-dir=.git --exclude-dir=vendor --exclude-dir=node_modules
  --exclude=composer.lock --exclude=package-lock.json --exclude=yarn.lock --exclude=pnpm-lock.yaml
  --exclude="$REPORT" --exclude=buscar-rastros.sh)
for excluded in ${EXCLUDE_FILES:-}; do GREP_OPTS+=(--exclude="$excluded"); done

institution_hits=0

section() { printf '\n==== %s ====\n' "$1"; }

search() {  # $1 = title, $2 = pattern
  section "$1"
  local out
  out=$(grep "${GREP_OPTS[@]}" -e "$2" "$ROOT" 2>/dev/null || true)
  if [[ -z "$out" ]]; then echo "(sin hallazgos)"; return 0; fi
  echo "$out"
  echo "-- $(printf '%s\n' "$out" | wc -l | tr -d ' ') líneas"
  return 1
}

find_docs() {
  find "$ROOT" \( -path '*/.git' -o -path '*/vendor' -o -path '*/node_modules' \) -prune -o \
    -type f \( -iname '*.pdf' -o -iname '*.docx' -o -iname '*.xlsx' -o -iname '*.odt' \
    -o -iname '*.ods' -o -iname '*.doc' -o -iname '*.xls' \) -print
}

{
  echo "Reporte de rastros - $(date '+%Y-%m-%d %H:%M') - carpeta: $ROOT"

  search "1. Nombres y términos de la institución (texto)" "$INSTITUTION" || institution_hits=1

  section "2. Archivos cuyo nombre menciona la institución o un logo"
  named=$(find "$ROOT" \( -path '*/.git' -o -path '*/vendor' -o -path '*/node_modules' \) -prune -o \
    -type f \( -iname '*sena*' -o -iname '*logo*' -o -iname '*escudo*' -o -iname '*firma*' \) -print)
  if [[ -n "$named" ]]; then
    echo "$named"
    if grep -qi 'sena' <<<"$named"; then institution_hits=1; fi
  else
    echo "(sin hallazgos)"
  fi

  section "3. Texto dentro de PDF, Word y Excel"
  shopt -s nocasematch  # also matches .PDF and .DOCX (works with the bash 3 of macOS)
  while IFS= read -r doc; do
    case "$doc" in
      *.docx|*.xlsx|*.odt|*.ods)
        if command -v unzip >/dev/null; then
          if unzip -p "$doc" 2>/dev/null | grep -aqiE "$INSTITUTION"; then
            echo "CONTIENE TÉRMINOS: $doc"; institution_hits=1
          fi
        else echo "REVISAR A MANO (falta unzip): $doc"; fi ;;
      *.pdf)
        if command -v pdftotext >/dev/null; then
          if pdftotext -q "$doc" - | grep -qiE "$INSTITUTION"; then
            echo "CONTIENE TÉRMINOS: $doc"; institution_hits=1
          fi
        else echo "REVISAR A MANO (falta pdftotext): $doc"; fi ;;
      *) echo "REVISAR A MANO (formato antiguo): $doc" ;;
    esac
  done < <(find_docs)
  echo "(fin de documentos)"

  section "4. Metadatos de imágenes y documentos (autor, empresa, GPS)"
  if command -v exiftool >/dev/null; then
    exiftool -r -q -if '$Author or $Creator or $Company or $Artist or $GPSLatitude' \
      -Author -Creator -Company -Artist -GPSLatitude \
      -ext pdf -ext docx -ext xlsx -ext jpg -ext jpeg -ext png "$ROOT" 2>/dev/null || true
  else
    echo "Instala exiftool para revisar metadatos (o revísalos a mano)."
  fi

  search "5. Correos electrónicos" "$EMAIL" || true
  search "6. Teléfonos celulares de Colombia" "$PHONE" || true
  search "7. Direcciones IP" "$IPV4" || true
  search "8. Posibles secretos (revisa cada línea)" "$SECRET" || true

  section "9. Archivos que no deberían estar en la demo"
  find "$ROOT" \( -path '*/.git' -o -path '*/vendor' -o -path '*/node_modules' \) -prune -o \
    -type f \( -name '.env' -o -name '.env.*' -o -iname '*.sql' -o -iname '*.sqlite' \
    -o -iname '*.dump' -o -iname '*.bak' -o -iname '*.zip' -o -iname '*.pem' -o -iname '*.key' \) \
    ! -name '.env.example' -print
  echo "(fin de la lista)"

  section "Resultado"
  if [[ $institution_hits -eq 0 ]]; then
    echo "OK: no quedan rastros institucionales detectables. Revisa igual las secciones 4 a 9."
  else
    echo "PENDIENTE: quedan rastros institucionales en las secciones 1 a 3."
  fi
} 2>&1 | tee "$REPORT"

exit "$(grep -q '^PENDIENTE' "$REPORT" && echo 1 || echo 0)"
