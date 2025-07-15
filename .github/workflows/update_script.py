import os
import requests
import json
from datetime import datetime

# 環境変数から秘密情報を取得
DISCORD_BOT_TOKEN = os.environ.get('DISCORD_BOT_TOKEN')
# ▽▽▽ ここはあなたのIDに書き換えてください ▽▽▽
ANNOUNCEMENT_CHANNEL_ID = "1394180022926966797" 
# △△△△△△△△△△△△△△△△△△△△△△△△△△△△△

# ファイルのパス
ANNOUNCEMENTS_FILE = 'announcements.json'
LAST_ID_FILE = '.github/workflows/last_message_id.txt'

def get_latest_discord_message():
    """Discordから最新のメッセージを1件取得する"""
    url = f"https://discord.com/api/v10/channels/{ANNOUNCEMENT_CHANNEL_ID}/messages?limit=1"
    headers = {'Authorization': f'Bot {DISCORD_BOT_TOKEN}'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        messages = response.json()
        return messages[0] if messages else None
    except requests.exceptions.RequestException as e:
        print(f"Discordへのリクエストでエラー: {e}")
        return None

# --- メイン処理 ---
try:
    print("処理開始...")
    latest_message = get_latest_discord_message()
    if not latest_message:
        print("Discordからメッセージを取得できませんでした。処理を終了します。")
        exit()
    
    print(f"最新メッセージ取得: {latest_message['id']}")

    last_processed_id = ""
    # ローカルのID保存ファイルを読む
    if os.path.exists(LAST_ID_FILE):
        with open(LAST_ID_FILE, 'r') as f:
            last_processed_id = f.read().strip()
    print(f"前回処理ID: {last_processed_id or 'なし'}")

    if latest_message['id'] != last_processed_id:
        print("新しいメッセージを検知。ファイルを更新します。")

        # ローカルのannouncements.jsonを読む
        announcements = []
        if os.path.exists(ANNOUNCEMENTS_FILE):
            with open(ANNOUNCEMENTS_FILE, 'r', encoding='utf-8') as f:
                announcements = json.load(f)
        else:
            print(f"{ANNOUNCEMENTS_FILE}が見つからないため、新規作成します。")

        # 新しいお知らせを作成して先頭に追加
        timestamp = datetime.fromisoformat(latest_message['timestamp'])
        new_entry = {
            "date": timestamp.strftime('%Y/%m/%d'),
            "content": latest_message['content'].replace('\n', '<br>')
        }
        announcements.insert(0, new_entry)
        
        # 更新した内容をローカルのファイルに書き出す
        with open(ANNOUNCEMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(announcements, f, ensure_ascii=False, indent=2)

        # 処理したIDをローカルのファイルに保存
        os.makedirs(os.path.dirname(LAST_ID_FILE), exist_ok=True)
        with open(LAST_ID_FILE, 'w') as f:
            f.write(latest_message['id'])

        print(f"ローカルファイルの更新完了: {new_entry['content']}")
    else:
        print("新しいメッセージはありません。")

except Exception as e:
    print(f"エラーが発生しました: {e}")
    exit(1)
