import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

# .envファイルがあれば読み込む（ローカルテスト用）
load_dotenv()

# 環境変数から秘密情報を取得
DISCORD_BOT_TOKEN = os.environ.get('DISCORD_BOT_TOKEN')

# ▽▽▽ ここはあなたのIDに書き換えてください ▽▽▽
ANNOUNCEMENT_CHANNEL_ID = "1393963700569767968" 
# △△△△△△△△△△△△△△△△△△△△△△△△△△△△△

# ファイルのパス
ANNOUNCEMENTS_FILE = 'announcements.json'
LAST_ID_FILE = '.github/workflows/last_message_id.txt'

def get_new_discord_messages(last_processed_id, limit=20):
    """Discordから最新のメッセージを複数件取得し、last_processed_idより新しいものだけ返す"""
    if not DISCORD_BOT_TOKEN:
        print("エラー: DISCORD_BOT_TOKENが設定されていません。")
        return []
    url = f"https://discord.com/api/v10/channels/{ANNOUNCEMENT_CHANNEL_ID}/messages?limit={limit}"
    headers = {'Authorization': f'Bot {DISCORD_BOT_TOKEN}'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        messages = response.json()
        # 新しい順で返ってくるので、IDで昇順に並べ替え
        messages = sorted(messages, key=lambda m: int(m['id']))
        new_msgs = []
        found_last = last_processed_id == ""
        for msg in messages:
            if not found_last:
                if msg['id'] == last_processed_id:
                    found_last = True
                continue
            new_msgs.append(msg)
        # last_processed_idが空なら全件返す
        if last_processed_id == "":
            return messages
        return new_msgs
    except requests.exceptions.RequestException as e:
        print(f"Discordへのリクエストでエラー: {e}")
        return []

# --- メイン処理 ---
try:
    print("処理開始...")

    last_processed_id = ""
    # ローカルのID保存ファイルを読む
    if os.path.exists(LAST_ID_FILE):
        with open(LAST_ID_FILE, 'r') as f:
            last_processed_id = f.read().strip()
    print(f"前回処理ID: {last_processed_id or 'なし'}")

    new_messages = get_new_discord_messages(last_processed_id, limit=20)
    if not new_messages:
        print("新しいメッセージはありません。")
        exit(0)

    print(f"{len(new_messages)}件の新しいメッセージを検知。ファイルを更新します。")

    # ローカルのannouncements.jsonを読む
    announcements = []
    if os.path.exists(ANNOUNCEMENTS_FILE):
        try:
            with open(ANNOUNCEMENTS_FILE, 'r', encoding='utf-8') as f:
                announcements = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            print(f"{ANNOUNCEMENTS_FILE}が見つからないか破損しているため、新規作成します。")
            announcements = []

    # 新しいお知らせを新しい順で先頭に追加
    for msg in reversed(new_messages):
        timestamp = datetime.fromisoformat(msg['timestamp'])
        new_entry = {
            "date": timestamp.strftime('%Y/%m/%d'),
            "content": msg['content'].replace('\n', '<br>')
        }
        announcements.insert(0, new_entry)

    # 更新した内容をローカルのファイルに書き出す
    with open(ANNOUNCEMENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(announcements, f, ensure_ascii=False, indent=2)

    # 一番新しいメッセージIDをローカルのファイルに保存
    os.makedirs(os.path.dirname(LAST_ID_FILE), exist_ok=True)
    with open(LAST_ID_FILE, 'w') as f:
        f.write(new_messages[-1]['id'])

    print(f"ローカルファイルの更新完了: {len(new_messages)}件")
    # 変更があったことを示すために、特別なファイルを作成
    with open("changes_made.txt", "w") as f:
        f.write("true")

except Exception as e:
    print(f"エラーが発生しました: {e}")
    exit(1)
