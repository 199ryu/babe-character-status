# babe-character-status

babeChat에서 전체 상태 쿼리를 담은 `![Status](URL)`을 출력하면 SVG 상태 이미지를 반환하는 Netlify Function입니다. 이 저장소는 검증된 운영 소스·내장 자산·빌드 설정만 포함합니다. 디자인 원본·개발 시안·캡처·캐릭터 설정 프롬프트는 배포 범위에서 제외했습니다.

## Netlify 배포

1. 이 저장소의 `main` 브랜치를 Netlify에서 연결합니다.
2. Base directory는 루트, Build command는 `npm run build`, Publish directory는 `public`, Functions directory는 `netlify/functions`입니다. `netlify.toml`에 포함되어 있습니다.
3. Node.js 24를 사용합니다. 필요한 경우 Netlify 런타임 환경변수 `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`를 지정합니다.
4. 배포 후 `status` 함수와 `/v1/red-r1/status.svg` 경로를 확인합니다. `public/`만 수동 업로드해서는 함수가 배포되지 않습니다.

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
