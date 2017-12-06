import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(private _http: HttpClient) { }

  ngOnInit() {
  }

  test() {
    const req = this._http.post('https://c887darp8f.execute-api.us-east-2.amazonaws.com/dev/auth', JSON.stringify({
      "type": "cat",
      "price": 123.11,
      "phone": "1234567890"

    }))
      .subscribe(
      res => {
        console.log(res);
      },
      err => {
        console.log("Error occured");
      }
      );
  }

}
