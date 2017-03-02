import { Injectable } from '@angular/core';
import { URLSearchParams, Http, Headers, RequestOptions } from '@angular/http';
const GITHUB_ID = '32850b7cc51df77449c3';
const GITHUB_SECRET = 'd9d6633c4b10a5710c765d132bb5894b991f7579';
const SALESFORCE_ID = '3MVG9i1HRpGLXp.oiN9rxRfG_CGxwuodgNVILBGWhhNCpto3amXm.mHfbQFCVyG2SMtldv8gzy6NIQl8AI5Fe';
const SALESFORCE_SECRET = '9019658089763482097';
const CORE_ID = '27c23c86fd25f553fc34658f7b311180cf8de7fa5bdc861ad2643a6967a73909';
const CORE_SECRET = '5cf278785db1feb9c486f84b6740e2b3ee94cd4bf9a1134a91d91db0f1a90e90';
const ORIGIN = window.location.origin;
const REDIRECT_URL = ORIGIN + '/oauth';

@Injectable()
export class OAuthService {

  constructor(private http: Http) { }

  // request new accessToken
  async authorize(
    authorizeObj: any,
    authorizeURL: string, // like  /oauth/authorize
    tokenObj: any,
    tokenURL: string, // like /oauth/access_token
    renderer, // used for presenting / listening to new window response
    query = false // query vs body
  ) {
    let authorizeParams = new URLSearchParams();
    for (let prop in authorizeObj) {
      authorizeParams.set(prop, authorizeObj[prop]);
    }

    // open window with renderer, wait for PostMessage response
    let { state: retState, code }: any = await new Promise((resolve, reject) => {
      let winRef = window.open(
        authorizeURL + '?' + authorizeParams.toString(),
        'Login',
        'toolbar=no,dependent=yes,height=600,width=600'
      );
      let done = renderer.listenGlobal('window', 'message', (event) => {
        if (event.source == winRef) {
          winRef.close();
          done();
          resolve(event.data);
        }
      });
    });

    let tokenParams = new URLSearchParams();
    for (let prop in tokenObj) {
      tokenParams.set(prop, tokenObj[prop]);
    }
    tokenParams.set('code', code);

    // sent 'state' must match received 'state'
    if (authorizeParams.paramsMap.has('state')) {
      if (authorizeParams.paramsMap.get('state')[0] !== retState) {
        // may be returned from different application oauth-oriztaion (mismatch)
        throw new Error('returned different state');
      }
      tokenParams.set('state', retState);
    }

    let headers = new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    let options = new RequestOptions({ headers });

    if (query) {
      options.search = tokenParams;
    }

    let { access_token: accessToken, refresh_token: refreshToken } = await this.http
      .post(tokenURL, !query ? tokenParams : null, options) // if query only send with search
      .map(response => response.json())
      .toPromise();

    return { accessToken, refreshToken };
  }

  authorizeGithub(renderer) {
    let origin = ORIGIN + '/gh';
    let authURL = `${ origin }/login/oauth/authorize`;
    let tokenURL = `${ origin }/login/oauth/access_token`;
    let scopes = ['repo', 'user'];
    let state = Math.random().toString(36).substring(2);

    return this.authorize(
      { client_id: GITHUB_ID, redirect_uri: REDIRECT_URL, scope: scopes.join(' '), state },
      authURL,
      { client_id: GITHUB_ID, client_secret: GITHUB_SECRET, state },
      tokenURL,
      renderer
    );
  }

  authorizeCore(renderer, refresh = false) {
    let origin = 'https://beta.dayautomation.com';
    let authURL = `${ origin }/oauth/authorize`;
    let tokenURL = `${ origin }/oauth/token`;

    return this.authorize(
      { client_id: CORE_ID, redirect_uri: REDIRECT_URL, scopes: 'user', response_type: 'code' },
      authURL,
      { client_id: CORE_ID, client_secret: CORE_SECRET, grant_type: 'authorization_code', redirect_uri: REDIRECT_URL },
      tokenURL,
      renderer
    );
  }

  authorizeSalesforce(renderer, refresh = false) {
    let origin = ORIGIN + '/sf';
    let authURL = `${ origin }/services/oauth2/authorize`;
    let tokenURL = `${ origin }/services/oauth2/token`;
    let state = Math.random().toString(36).substring(2);

    return this.authorize(
      { client_id: SALESFORCE_ID, redirect_uri: REDIRECT_URL, response_type: 'code', state },
      authURL,
      { client_id: SALESFORCE_ID, client_secret: SALESFORCE_SECRET, grant_type: 'authorization_code', redirect_uri: REDIRECT_URL, state },
      tokenURL,
      renderer,
      true
    );
  }
}
