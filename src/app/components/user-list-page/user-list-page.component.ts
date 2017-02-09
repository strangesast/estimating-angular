import { Renderer, Component, OnInit, OnDestroy } from '@angular/core';
import { RequestOptions, URLSearchParams, Http, Response, Headers } from '@angular/http';

import { Observable } from 'rxjs';

import { UserService } from '../../services/user.service';
import { ElementService } from '../../services/element.service';
import { User } from '../../models';

const MY_ADDR = 'http://10.0.10.101';
const ADDR = 'http://10.0.32.102:3000';
const CLIENT_ID = '4e94c3e539fd175f7f744b57ecf0c7e00f2b0510df1f6d8ab9ebb78b2eb1bc8c';

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
    this.windowURL = ADDR + '/oauth/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(MY_ADDR + '/oauth') + '&response_type=code' + '&scopes=' + 'user';
    this.windowMessageListener = this.renderer.listenGlobal('window', 'message', (event) => {
      console.log('event', event);
      let data = event.data;

      console.log('code', data.code);

      this.userService.initAuth(data.code);

      let path = '/data/part_catalogs/bP93V4A6Or4l0babQGiIbg.json'; // '/sessions/me.json';
      //let path = '/sessions/me.json';

      let url = ADDR + path;
      let options = new RequestOptions({ headers: new Headers({ 'Authorization': 'Bearer ' + data.code }) });
      /*
      let params = new URLSearchParams();
      */
      this.http.get(url, options).switchMap(res => {

        console.log(res.json());
        return Observable.never();
      }).toPromise().then(res => {
        console.log('res', res);
      });
      /*
      http.get(ADDR + '/data/part_catalogs/bP93V4A6Or4l0babQGiIbg.json')
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
