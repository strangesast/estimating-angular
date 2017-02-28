import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-oauth',
  templateUrl: './oauth.component.html',
  styleUrls: ['./oauth.component.css']
})
export class OAuthComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    if (window.opener) {
      let search = location.search;
      if (search.startsWith('?')) {
        let arr = search.slice(1).split('=');
        let i = arr.indexOf('code');
        if (i != -1) {
          let code = arr[i+1];
          let message = { code: code };
          return window.opener.postMessage(message, window.location.origin);
        }
      }
    }
    this.router.navigateByUrl('/');
  }

}
