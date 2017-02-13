import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { URLSearchParams, Http, Headers, RequestOptions } from '@angular/http';
import { Resolve, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';

import { User } from '../models';

import { environment } from '../../environments/environment';
const { LOCAL_ADDR, API_ADDR, CLIENT_ID, CLIENT_SECRET } = environment;

const AnonymousUser = new User('Anonymous', 'anonymous', 'anon@anon.com');

const REDIRECT_URI = `${ LOCAL_ADDR }/oauth`;

@Injectable()
export class UserService implements OnInit, OnDestroy, CanActivate, Resolve<any> {
  currentUser: BehaviorSubject<User> = new BehaviorSubject<User>(null);
  accessToken: string;
  authorizationCode: string;
  authorizationOptions: RequestOptions;
  refreshToken: string;

  initialized = new BehaviorSubject(false);

  redirectedFromUrl: string;
  authWindowURL: string;

  constructor(private router: Router, private http: Http) {
    this.init();
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let user = this.currentUser.getValue();
    if (user) {
      return true;
    } else if (this.accessToken) {
      user = await this.getCurrentUser();
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
    this.authorizationOptions = new RequestOptions({ headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }) });

    let user = localStorage.getItem('user');

    if (user) {
      this.currentUser.next(JSON.parse(user));
    }

    let params = new URLSearchParams();
    params.set('client_id', CLIENT_ID);
    params.set('response_type', 'code');
    params.set('redirect_uri', REDIRECT_URI);
    params.set('scopes', 'user');
    this.authWindowURL = `${ API_ADDR }/oauth/authorize?${ params.toString() }`;
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
    this.authorizationOptions = new RequestOptions({ headers: new Headers({ 'Authorization': 'Bearer ' + (token || this.accessToken) }) });
    let r1 = await this.http.get(`${ API_ADDR }/sessions/me.json`, this.authorizationOptions)
      .map(res => res.json())
      .toPromise();

    if (r1 && r1.user ) {
      let user = r1.user;
      let r2 = await this.http.get(`${ API_ADDR }/data/people/${ user.person_id }.json`, this.authorizationOptions)
        .map(res => res.json())
        .toPromise();

      if (r2 && r2.person) {
        let person = r2.person;
        return Object.assign(person, { username: user.name });
      }
    }
    return null;
  }

  async refresh() {
    if (!this.refreshToken) throw new Error('need a refresh token for refresh');
    return this.login(this.refreshToken, true);
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

    localStorage.setItem('user', JSON.stringify(user));
    
    this.currentUser.next(user);

    return user;
  }

  async logout() {
    this.accessToken = null;
    localStorage.removeItem('access_token');
    this.refreshToken = null;
    localStorage.removeItem('refresh_token');
    this.currentUser.next(null);
    localStorage.removeItem('user');
  }

  async resolve() {
    return this.currentUser;
  }
  ngOnInit() {}
  ngOnDestroy() {}


}
