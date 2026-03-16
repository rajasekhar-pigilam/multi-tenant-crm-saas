import { HttpInterceptorFn } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { catchError, throwError, timeout } from 'rxjs';

const REQUEST_TIMEOUT_MS = 30_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    catchError(err => {
      if (err instanceof TimeoutError) {
        return throwError(
          () => ({ error: { message: 'Request timed out. The server may be waking up — please try again in a moment.' }, status: 408 })
        );
      }
      return throwError(() => err);
    })
  );
};
