import type {Config} from '@netlify/functions';
import {handleStatusRequest} from '../../src/status/handle.ts';

export default function status(request:Request):Response {
  return handleStatusRequest(request);
}
// Do not restrict method here: the common handler must return 405 + Allow.
export const config:Config={path:'/v1/*'};
