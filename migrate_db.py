import urllib.request
import json

API_GET_URL = "http://43.203.237.63:3001/api/db/erp_users_db"
API_POST_URL = "http://43.203.237.63:3001/api/db/erp_users_db"

def migrate():
    try:
        # 1. 서버에서 기존 사용자 DB 데이터 가져오기
        req = urllib.request.Request(API_GET_URL)
        with urllib.request.urlopen(req) as response:
            db_data = json.loads(response.read().decode('utf-8'))
        
        print("Original DB sample:", list(db_data.items())[:5])
        
        # 2. 6자리 패스워드 마이그레이션 적용
        migrated_count = 0
        for emp_id, info in db_data.items():
            pwd = str(info.get('password', ''))
            
            # 대표이사 특별 보정
            if emp_id == '001':
                if pwd == '1234':
                    info['password'] = '123456'
                    migrated_count += 1
                    print(f"Migrated Director 001 password: {pwd} -> 123456")
                continue
                
            # 일반 사원 4자리 패스워드를 6자리로 변환 (뒤에 00 패딩)
            if len(pwd) == 4:
                new_pwd = pwd + "00"
                info['password'] = new_pwd
                migrated_count += 1
                print(f"Migrated Employee {emp_id} password: {pwd} -> {new_pwd}")
            elif len(pwd) < 6:
                # 6자리보다 짧은 비번은 우측에 0으로 채움
                new_pwd = pwd.ljust(6, '0')
                info['password'] = new_pwd
                migrated_count += 1
                print(f"Migrated Employee {emp_id} password: {pwd} -> {new_pwd}")

        print(f"Total migrated users: {migrated_count}")
        
        # 3. 서버에 업데이트된 DB 데이터 저장
        post_data = json.dumps(db_data).encode('utf-8')
        req_post = urllib.request.Request(
            API_POST_URL, 
            data=post_data, 
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req_post) as response_post:
            result = json.loads(response_post.read().decode('utf-8'))
            print("Server response:", result)
            
        print("Migration Completed Successfully!")
    except Exception as e:
        print("Migration Failed:", str(e))

if __name__ == "__main__":
    migrate()
