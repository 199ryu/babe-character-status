import {parseStatus} from './parse.ts';
import {renderStatus,renderError} from './svg.ts';

export const STATUS_PATH='/v1/red-r1/status.svg';

/** Stateless image endpoint; never log request URLs or state text here. */
export function handleStatusRequest(request:Request):Response {
  return handleStatusTarget(new URL(request.url),request.method);
}

/** Same policy for HTTP methods that the Fetch Request constructor forbids. */
export function handleStatusTarget(url:URL,method:string):Response {
  const head=method==='HEAD';
  const respond=(status:number,render:()=>string,allow=false)=>new Response(head?null:render(),{
    status,
    headers:{
      'Content-Type':'image/svg+xml; charset=utf-8',
      'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff',
      ...(allow?{Allow:'GET, HEAD'}:{}),
    },
  });
  if(url.pathname!==STATUS_PATH)return respond(404,()=>renderError('지원하지 않는 상태창 주소입니다.'));
  if(method!=='GET'&&!head)return respond(405,()=>renderError('지원하지 않는 요청 방식입니다. GET 또는 HEAD를 사용해 주세요.'),true);
  const parsed=parseStatus(url);
  if(!parsed.ok)return respond(parsed.status,()=>renderError(parsed.message));
  return respond(200,()=>renderStatus(parsed.state));
}
