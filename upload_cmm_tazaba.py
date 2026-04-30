import os, time, hashlib, requests

CLOUD_NAME = 'df8f1vyra'
API_KEY = '368876168795554'
API_SECRET = 'EFhSqZQkkGr7CaoGM-pW8ZDDjbM'
FILE_PATH = r'C:/Users/Aves/Desktop/backup/avessalom087/avessalom087.github.io/CMM_Tazaba.png'

if not os.path.isfile(FILE_PATH):
    raise FileNotFoundError(f'Image file not found: {FILE_PATH}')

timestamp = int(time.time())
signature_str = f'timestamp={timestamp}{API_SECRET}'
signature = hashlib.sha1(signature_str.encode()).hexdigest()

url = f'https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload'
files = {'file': open(FILE_PATH, 'rb')}
data = {
    'api_key': API_KEY,
    'timestamp': timestamp,
    'signature': signature,
}

response = requests.post(url, files=files, data=data)
print('Status code:', response.status_code)
print('Response text:', response.text)
if response.status_code == 200:
    result = response.json()
    print('Secure URL:', result.get('secure_url'))
    # Save URL to a file for later use
    with open('cloudinary_upload_result.txt', 'w') as f:
        f.write(result.get('secure_url', ''))
else:
    raise Exception('Upload failed')
