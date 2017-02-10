import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { URLSearchParams, Http, Headers, RequestOptions } from '@angular/http';
import { Resolve, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';

import { User } from '../models';

const AnonymousUser = new User('Anonymous', 'anonymous', 'anon@anon.com');

const LOCAL_ADDR = 'http://127.0.0.1';
const API_ADDR = 'https://beta.dayautomation.com';
const CLIENT_ID = '27c23c86fd25f553fc34658f7b311180cf8de7fa5bdc861ad2643a6967a73909';
const CLIENT_SECRET = '5cf278785db1feb9c486f84b6740e2b3ee94cd4bf9a1134a91d91db0f1a90e90';
const REDIRECT_URI = `${ LOCAL_ADDR }/oauth`;

@Injectable()
export class UserService implements OnInit, OnDestroy, CanActivate, Resolve<any> {
  currentUser: BehaviorSubject<User> = new BehaviorSubject<User>(null);
  accessToken: string;
  authorizationCode: string;
  refreshToken: string;

  initialized = new BehaviorSubject(false);

  redirectedFromUrl: string;
  authWindowURL: string;

  constructor(private router: Router, private http: Http) {
    this.init();
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let user = this.currentUser.getValue();
    if (user) return true;

    if (this.accessToken) {
      let user = await this.getCurrentUser();
      if (user) {
        this.currentUser.next(user);
        return true;
      }
    }

    this.redirectedFromUrl = state.url;
    this.router.navigate(['/login']);
    return false;
  }

  async init() {
    this.accessToken = localStorage.getItem('access_token');
    this.authorizationCode = localStorage.getItem('authorization_code'); // 'code'
    this.refreshToken = localStorage.getItem('refresh_token');

    let params = new URLSearchParams();
    params.set('client_id', CLIENT_ID);
    params.set('response_type', 'code');
    params.set('redirect_uri', REDIRECT_URI);
    params.set('scopes', 'user');
    this.authWindowURL = `${ API_ADDR }/oauth/authorize?${ params.toString() }`;

    if (!this.accessToken) {
      return;
    }
  }

  completeNavigation() {
    // if url is stored (from redirect) go there
    if (this.redirectedFromUrl) {
      this.router.navigateByUrl(this.redirectedFromUrl);
      this.redirectedFromUrl = null;
      return;
    }
    this.router.navigate(['/jobs']);
  }

  async getCurrentUser(token?: string) {
    if (!this.accessToken && !token) return null;
    let options = new RequestOptions({ headers: new Headers({ 'Authorization': 'Bearer ' + (token || this.accessToken) }) });
    let response = await this.http.get(`${ API_ADDR }/sessions/me.json`, options).map(res => res.json()).toPromise();
    return response && response.user && (await this.http.get(`${ API_ADDR }/data/people/${ response.user.person_id }.json`, options).map(res => res.json()).toPromise());
  }

  async login(authorizationCode: string, refresh = false) {
    let body = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: refresh ? 'refresh_token' : 'authorization_code'
    };
    body[refresh ? 'refresh_token' : 'code'] = authorizationCode;
    let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    let { access_token: accessToken, refresh_token: refreshToken } = await this.http.post(`${ API_ADDR }/oauth/token`, body, headers).map(response => response.json()).toPromise();

    this.accessToken = accessToken;
    localStorage.setItem('access_token', accessToken);
    this.refreshToken = refreshToken;
    localStorage.setItem('refresh_token', refreshToken);

    let user = await this.getCurrentUser();
    
    this.currentUser.next(user);

    return user;
  }

  async resolve() {
    return this.currentUser;
  }
  ngOnInit() {}
  ngOnDestroy() {}


}
