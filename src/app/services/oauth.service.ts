import { Injectable } from '@angular/core';
import { URLSearchParams, Http, Headers, RequestOptions } from '@angular/http';

import { Observable } from 'rxjs';

@Injectable()
export class OAuthService {

  constructor(private http: Http) { }

  // request new accessToken
  async authorize(
    authorizeParams: URLSearchParams,
    authorizeURL: string, // like  /oauth/authorize
    tokenParams: any,
    tokenURL: string, // like /oauth/access_token
    renderer, // used for presenting / listening to new window response
    query = false // query vs body
  ) {
    let fullPath = authorizeURL + '?' + authorizeParams.toString();

    let response = await new Promise((resolve, reject) => {
      let winRef = window.open(fullPath, 'Login', 'toolbar=no,dependent=yes,height=600,width=600'); let done = renderer.listenGlobal('window', 'message', (event) => {
        if (event.source == winRef) {
          winRef.close();
          done();
          resolve(event.data);
        }
      });
    });
    let { state: retState, code }: any = response;

    if (authorizeParams.paramsMap.has('state')) {
      if (authorizeParams.paramsMap.get('state')[0] !== retState) {
        // may be returned from different application oauth-oriztaion (mismatch)
        throw new Error('returned different state');
      }
      tokenParams.set('state', retState);
    }
  
    tokenParams.set('code', code);

    let options = new RequestOptions({ headers: new Headers({ 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }) });

    if (query) {
      options.search = tokenParams;
    }

    let { scope, access_token: accessToken, token_type: tokenType, refresh_token: refreshToken } = await this.http.post(tokenURL, !query ? tokenParams : null, options)
      .map(response => response.json())
      .toPromise();

    return { accessToken, refreshToken };
  }

  authorizeGithub(renderer) {
    let id = '32850b7cc51df77449c3';
    let secret = 'd9d6633c4b10a5710c765d132bb5894b991f7579';

    let authParams = new URLSearchParams();

    let scopes = ['repo', 'user'];
    authParams.set('scope', scopes.join(' '));

    let state = Math.random().toString(36).substring(2);
    authParams.set('state', state);

    authParams.set('client_id', id);
    authParams.set('redirect_uri', `${ window.location.origin }/oauth`);

    let authURL = window.location.origin + '/gh/login/oauth/authorize';

    let tokenParams = new URLSearchParams();
    tokenParams.set('client_id', id);
    tokenParams.set('client_secret', secret);
    tokenParams.set('state', state);

    let tokenURL = window.location.origin + '/gh/login/oauth/access_token';

    return this.authorize(authParams, authURL, tokenParams, tokenURL, renderer);
  }

  authorizeCore(renderer, refresh = false) {
    let id = '27c23c86fd25f553fc34658f7b311180cf8de7fa5bdc861ad2643a6967a73909';
    let secret = '5cf278785db1feb9c486f84b6740e2b3ee94cd4bf9a1134a91d91db0f1a90e90';
    
    let origin = 'https://beta.dayautomation.com';
    let authURL = `${ origin }/oauth/authorize`;
    let tokenURL = `${ origin }/oauth/token`;

    let authParams = new URLSearchParams();
    authParams.set('client_id', id);
    let redirectURI = `${ window.location.origin }/oauth`;
    authParams.set('redirect_uri', redirectURI);
    authParams.set('scopes', 'user');
    authParams.set('response_type', 'code');

    let tokenParams = new URLSearchParams();
    tokenParams.set('client_id', id);
    tokenParams.set('client_secret', secret);
    tokenParams.set('grant_type', 'authorization_code');
    tokenParams.set('redirect_uri', redirectURI);

    return this.authorize(authParams, authURL, tokenParams, tokenURL, renderer);
  }

  authorizeSalesforce(renderer, refresh = false) {
    let id = '3MVG9i1HRpGLXp.oiN9rxRfG_CGxwuodgNVILBGWhhNCpto3amXm.mHfbQFCVyG2SMtldv8gzy6NIQl8AI5Fe';
    let secret = '9019658089763482097';
    
    let origin = window.location.origin + '/sf';
    let authURL = `${ origin }/services/oauth2/authorize`;
    let tokenURL = `${ origin }/services/oauth2/token`;

    let authParams = new URLSearchParams();

    let state = Math.random().toString(36).substring(2);
    authParams.set('state', state);

    authParams.set('client_id', id);
    let redirectURI = `${ window.location.origin }/oauth`;
    authParams.set('redirect_uri', redirectURI);
    //authParams.set('scopes', 'user');
    authParams.set('response_type', 'code');

    let tokenParams = new URLSearchParams();
    tokenParams.set('client_id', id);
    tokenParams.set('client_secret', secret);
    tokenParams.set('grant_type', 'authorization_code');
    tokenParams.set('redirect_uri', redirectURI);
    tokenParams.set('state', state);

    return this.authorize(authParams, authURL, tokenParams, tokenURL, renderer, true);
  }


}
