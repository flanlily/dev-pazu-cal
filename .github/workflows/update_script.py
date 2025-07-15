import os
import requests
import json
from datetime import datetime
import base64

# 環境変数から秘密情報を取得
DISCORD_BOT_TOKEN = os.environ['DISCORD_BOT_TOKEN']
GITHUB_TOKEN = os.environ['GH_PAT']
GITHUB_USER = os.environ['GITHUB_USER']
GITHUB_REPO = os.environ['GITHUB_REPO']

# ▽▽▽ ここはあなたのIDに書き換えてください ▽▽▽
ANNOUNCEMENT_CHANNEL_ID = "1394180022926966797" 
# △△△△△△△△△△△△△△△△△△△△△△△△△△△△△

# ファイルのパス
ANNOUNCEMENTS_FILE_PATH = 'announcements.json'
LAST_ID_FILE_PATH = '.github/workflows/last_message_id.txt' # 最後に処理したIDを保存するファイル

def get_latest_discord_message():
    """Discordから最新のメッセージを1件取得する"""
    url = f"https://discord.com/api/v10/channels/{ANNOUNCEMENT_CHANNEL_ID}/messages?limit=1"
    headers = {'Authorization': f'Bot {DISCORD_BOT_TOKEN}'}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        messages = response.json()
        if messages:
            return messages[0]
        return None
    except requests.exceptions.RequestException as e:
        print(f"Discordへのリクエストでエラー: {e}")
        return None

def get_file_from_github(path):
    """GitHubからファイルを取得する (SHAを含む)"""
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github.v3+json'}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 404:
            print(f"{path}が見つかりません。")
            return None
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"GitHubからのファイル取得でエラー ({path}): {e}")
        return None

def update_file_on_github(path, content_string, sha, commit_message):
    """GitHubのファイルを更新する"""
    url = f"https://api.github.com/repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{path}"
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    encoded_content = base64.b64encode(content_string.encode('utf-8')).decode('utf-8')
    data = {
        "message": commit_message,
        "content": encoded_content,
        "sha": sha
    }
    response = requests.put(url, headers=headers, json=data)
    response.raise_for_status()
    print(f"GitHubのファイルを更新しました: {path}")


# --- メイン処理 ---
try:
    print("処理開始...")
    latest_message = get_latest_discord_message()
    if not latest_message:
        print("Discordからメッセージを取得できませんでした。")
        exit()
    
    print(f"最新メッセージ取得: {latest_message['id']}")

    last_id_file = get_file_from_github(LAST_ID_FILE_PATH)
    last_processed_id = ""
    if last_id_file:
        last_processed_id = base64.b64decode(last_id_file['content']).decode('utf-8').strip()
    
    print(f"前回処理ID: {last_processed_id or 'なし'}")

    if latest_message['id'] != last_processed_id:
        print("新しいメッセージを検知。ファイルを更新します。")

        # announcements.jsonの取得
        announcements_file = get_file_from_github(ANNOUNCEMENTS_FILE_PATH)
        if announcements_file:
            current_content = base64.b64decode(announcements_file['content']).decode('utf-8')
            announcements = json.loads(current_content)
            current_sha = announcements_file['sha']
        else:
            print("announcements.jsonが見つからないため、新規作成します。")
            announcements = []
            current_sha = None # 新規作成の場合はSHAは不要（APIの挙動に任せる）

        # 新しいお知らせを作成して先頭に追加
        timestamp = datetime.fromisoformat(latest_message['timestamp'])
        new_entry = {
            "date": timestamp.strftime('%Y/%m/%d'),
            "content": latest_message['content'].replace('\n', '<br>')
        }
        announcements.insert(0, new_entry)
        
        # GitHubのannouncements.jsonを更新
        updated_announcements_string = json.dumps(announcements, ensure_ascii=False, indent=2)
        update_file_on_github(ANNOUNCEMENTS_FILE_PATH, updated_announcements_string, current_sha, f"[Bot] Update announcements.json")

        # 最後に処理したIDを更新
        last_id_sha = last_id_file['sha'] if last_id_file else None
        update_file_on_github(LAST_ID_FILE_PATH, latest_message['id'], last_id_sha, f"[Bot] Update last message ID")

        print(f"ファイル更新完了: {new_entry['content']}")
    else:
        print("新しいメッセージはありません。")

except Exception as e:
    print(f"エラーが発生しました: {e}")
    # エラーで終了
    exit(1)
