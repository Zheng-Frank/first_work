import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { RootComponent } from './components/root/root.component';
import { HomeComponent } from './components/home/home.component';
import { Bs4Component } from './components/bs4/bs4.component';
import { HeaderComponent } from './components/header/header.component';

import { QmenuUIModule } from 'qmenu-ui';
import { LoginComponent } from './components/login/login.component';
import { GlobalService } from './services/global.service';
import { MarketerGuard } from './marketer.guard';
import { ApiService } from './services/api.service';


@NgModule({
  declarations: [
    RootComponent,
    HomeComponent,
    Bs4Component,
    HeaderComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    HttpModule,
    QmenuUIModule
  ],
  providers: [
    GlobalService,
    MarketerGuard,
    ApiService
  ],
  bootstrap: [RootComponent]
})
export class AppModule { }
