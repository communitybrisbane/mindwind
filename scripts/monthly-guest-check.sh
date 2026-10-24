#!/bin/sh
# 毎月1日の定期実行（launchd com.taku.mindwind-guest-check）。控えを取り、掃除対象をドライランで調べるだけ。
# 消す（--apply）のは人が対象を見てから。手順は docs/OPS-guest-cleanup.md。
export PATH="/usr/local/bin:/usr/bin:/bin"
cd "$(dirname "$0")/.." || exit 1
echo "===== $(date '+%Y-%m-%d %H:%M:%S') ====="
npm run backup 2>&1 | grep -v "^$"
npm run cleanup:guests 2>&1 | grep -v -i "warning\|Reparsing\|eliminate\|trace-warnings"
