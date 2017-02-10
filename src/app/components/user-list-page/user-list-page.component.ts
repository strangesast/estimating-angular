import { Renderer, Component, OnInit, OnDestroy } from '@angular/core';
import { RequestOptions, URLSearchParams, Http, Response, Headers } from '@angular/http';

import { Observable } from 'rxjs';

import { UserService } from '../../services/user.service';
import { ElementService } from '../../services/element.service';
import { User } from '../../models';

const MY_ADDR = 'http://127.0.0.1';
const REMOTE_ADDR = 'https://beta.dayautomation.com';
const CLIENT_ID = '27c23c86fd25f553fc34658f7b311180cf8de7fa5bdc861ad2643a6967a73909';
const SECRET = '5cf278785db1feb9c486f84b6740e2b3ee94cd4bf9a1134a91d91db0f1a90e90';

@Component({
  selector: 'app-user-list-page',
  templateUrl: './user-list-page.component.html',
  styleUrls: ['../../styles/general.less', './user-list-page.component.less']
})
export class UserListPageComponent implements OnInit {
  users: User[];
  windowReference;
  windowURL: string;
  windowMessageListener: Function;

  constructor(private elementService: ElementService, private http: Http, private renderer: Renderer, private userService: UserService) { }

  ngOnInit() {
    let redirectURI = MY_ADDR + '/oauth';
    this.windowURL = REMOTE_ADDR + '/oauth/authorize' + '?client_id=' + encodeURIComponent(CLIENT_ID) + '&redirect_uri=' + encodeURIComponent(redirectURI) + '&response_type=code' + '&scopes=' + 'user';
    let params = new URLSearchParams();
    params.set('client_id', CLIENT_ID);
    params.set('redirect_uri', redirectURI);
    params.set('response_type', 'code');
    params.set('scopes', 'user');
    console.log(this.windowURL);
    this.windowURL = REMOTE_ADDR + '/oauth/authorize' + '?' + params.toString();
    console.log(this.windowURL);
    this.windowMessageListener = this.renderer.listenGlobal('window', 'message', async(event) => {
      let data = event.data;

      let body = {
        client_id: CLIENT_ID,
        client_secret: SECRET,
        code: data.code,
        grant_type: 'authorization_code',
        redirect_uri: redirectURI
      };
      let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
      let { access_token: token } =  await this.http.post(`${ REMOTE_ADDR }/oauth/token`, body, headers).map(res => res.json()).toPromise();
      console.log('token', token);

      let options = new RequestOptions({ headers: new Headers({ 'Authorization': 'Bearer ' + token }) });
      let { user } = await this.http.get(REMOTE_ADDR + '/sessions/me.json', options).map(res => res.json()).toPromise();
      console.log('current_user', user)

      //let partId = 'bLiI8UA6Or4l0babQGiIbg';
      let partId = 'b-tIVerz4r5AdsjVWFsTid';
      let res = await this.http.get(`${ REMOTE_ADDR }/data/part_catalogs/${ partId }.json`, options).map(res => res.json()).toPromise();
      console.log('res', res);

      let person = await this.http.get(`${ REMOTE_ADDR }/data/people/${ user.person_id }.json`, options).map(res => res.json()).toPromise();
      console.log('person', person)

      let params = new URLSearchParams();
      params.set('search', 'THERMAL');
      let searchOptions = options.merge({ search: params });
      let search = await this.http.get(`${ REMOTE_ADDR }/search.json`, searchOptions).map(res => res.json()).toPromise();

      console.log('search', search);


      /*
      let path = ; // '/sessions/me.json';
      //let path = '/sessions/me.json';

      let url = REMOTE_ADDR + path;
      let options = new RequestOptions({ headers: new Headers({ 'Authorization': 'Bearer ' + data.code }) });
      let params = new URLSearchParams();
      this.http.get(url, options).switchMap(res => {

        console.log(res.json());
        return Observable.never();
      }).toPromise().then(res => {
        console.log('res', res);
      });
      */

      /*
      http.get(REMOTE_ADDR + '/data/part_catalogs/bP93V4A6Or4l0babQGiIbg.json')
      */
    });
  }

  authenticate() {
    if (this.windowReference && !this.windowReference.closed) {
      console.log(this.windowReference);
      this.windowReference.focus();
    } else {
      this.windowReference = window.open(this.windowURL, 'Core Access Request')
    }
  }

  ngOnDestroy() {
    if (this.windowReference) {
      this.windowReference.close();
    }
    this.windowMessageListener();
  }

}
