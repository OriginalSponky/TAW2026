import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('jwt_token');
    let authReq = req;

    // Seleziona le chiamate verso il backend e aggiunge il token
    if (token && req.url.startsWith('http://localhost:3000')) {
        authReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
    }

    // Manda la richiesta e intercetta eventuali errori di sicurezza
    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            // 401 = Token scaduto/mancante | 403 = Ruolo non autorizzato
            if (error.status === 401 || error.status === 403) {
                console.warn("Sessione scaduta o accesso negato. Esecuzione logout forzato.");

                // Clean LocalStorage
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('utenteLoggato');

                // Page Reload
                window.location.reload();
            }
            return throwError(() => error);
        })
    );
};