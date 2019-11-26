import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LoginComponent} from './login/login.component';
import {AlertComponent} from './component/alert/alert.component';
import {ProgramComponent} from './program/program.component';
import {AuthGuard} from './service/authguard';
import {CookieService} from 'ngx-cookie-service';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {GoogleMapsModule} from '@angular/google-maps';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {MatToolbarModule} from '@angular/material/toolbar';
import {ServiceWorkerModule} from '@angular/service-worker';
import {BigmapComponent} from './bigmap/bigmap.component';
import {LazyLoadImageModule} from 'ng-lazyload-image';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {AuthInterceptor} from './interceptor/auth.interceptor';
import {EditInputComponent} from './component/edit-input/edit-input.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AlertComponent,
    ProgramComponent,
    BigmapComponent,
    EditInputComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatListModule,
    MatToolbarModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    GoogleMapsModule,
    MatButtonModule,
    LazyLoadImageModule,
    ServiceWorkerModule.register('ngsw-worker.js', {enabled: true}),
    MatMenuModule,
    MatIconModule
  ],
  providers: [AuthGuard,
    CookieService,
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true}
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
