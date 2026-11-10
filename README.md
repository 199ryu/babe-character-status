# babe-character-status

babeChat에서 전체 상태 쿼리를 담은 `![Status](URL)`을 출력하면 SVG 상태 이미지를 반환하는 Netlify Function입니다. 이 저장소는 검증된 운영 소스·내장 자산·빌드 설정만 포함합니다. 디자인 원본·개발 시안·캡처·캐릭터 설정 프롬프트는 배포 범위에서 제외했습니다.

## Netlify 배포

1. 이 저장소의 `main` 브랜치를 Netlify에서 연결합니다.
2. Base directory는 루트, Build command는 `npm run build`, Publish directory는 `public`, Functions directory는 `netlify/functions`입니다. `netlify.toml`에 포함되어 있습니다.
3. Node.js 24를 사용합니다. 필요한 경우 Netlify 런타임 환경변수 `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`를 지정합니다.
4. 배포 후 `status` 함수와 `/v1/red-r1/status.svg` 경로를 확인합니다. `public/`만 수동 업로드해서는 함수가 배포되지 않습니다.

## 단계별 애니메이션

1~4단계는 각각 열기, 좌우 파동, 팽창 맥동, 연속 상승 열기로 배경이 움직입니다. 1단계는 작은 수직 일렁임을 사용하고, 4단계는 투명도 변화 없이 무늬를 연속해서 위로 이동시킵니다. 4단계의 움직이는 배경 뒤에는 정지 아우라를 겹치지 않습니다.

`stage=2`와 `stage=3`은 배경 보정된 72개 인물 프레임을 12fps로 6초마다 반복합니다. 0·1·4단계 인물은 정지 이미지입니다. 모든 자산은 SVG 안에 내장되며 외부 영상을 요청하지 않습니다. 동작 줄이기 설정에서는 배경 애니메이션을 숨기고, 움직이는 인물은 첫 프레임을 표시합니다. 기존 URL과 쿼리 규칙은 동일합니다. babeChat 이미지 프록시의 실제 재생 여부는 별도로 확인해야 합니다.

## 로컬 빌드

```sh
npm ci
npm run typecheck
npm run build
```

공식 Netlify 번들러로 함수를 만들고 생성 모듈의 GET/HEAD/POST·SVG 크기·라우팅을 검사합니다. 실제 Netlify 실행 검증과는 구분합니다.

## 입력과 응답

쿼리 키: `loc`, `seen`, `time`, `mode`, `scenario`, `outfit`, `stage`, `reality`, `reason`, `arousal`, `shame`, `commands`, 반복 `cmd`, `thought`, `phase`. 전체 현재 상태를 매 요청에 넣습니다. 서버는 저장·갱신하지 않습니다.

GET/HEAD를 허용하고, SVG와 `Cache-Control: private, no-store`를 반환합니다. 직렬화·퍼센트 인코딩된 전체 URL이 UTF-8 8192바이트를 넘으면414, cmd 외 알려진 키 중복은400, 잘못된 v1 경로는404, 허용되지 않은 메서드는405입니다. 외부 이미지·폰트·스크립트에 의존하지 않으며 자산은 JSON 안에 내장되어 있습니다. 실제 babeChat의 SVG 허용·이미지 프록시·작은 화면 축소는 별도로 확인해야 합니다.
