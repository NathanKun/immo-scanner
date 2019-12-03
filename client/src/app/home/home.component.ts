import {AfterViewInit, Component, ElementRef, HostListener, OnInit, QueryList, Renderer2, ViewChild, ViewChildren} from '@angular/core';
import {ProgramService} from '../service/program.service';
import {ProgramDateLot} from '../model/programdatelot';
import {GoogleMap, MapMarker} from '@angular/google-maps';
import {CookieService} from 'ngx-cookie-service';
import {Title} from '@angular/platform-browser';
import {environment} from '../../environments/environment';
import {ScrollService} from '../service/scroll.service';
import {Router} from '@angular/router';
import {MapInitService} from '../service/mapinit.service';
import {MatRipple} from '@angular/material/core';
import {RealEstateDeveloper} from '../model/realestatedeveloper';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  private hidProgramsCookieName = 'hid_programs';
  hideHidPrograms = true;

  @ViewChildren('programcard') programcards: QueryList<ElementRef>;
  @ViewChildren(MatRipple) rippleList: QueryList<MatRipple>;
  programDateLots: ProgramDateLot[];

  zoom = 13;
  center: google.maps.LatLngLiteral;
  options: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    zoomControl: true,
    scaleControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
    maxZoom: 18,
    minZoom: 8,
  };

  @ViewChild(GoogleMap) map: GoogleMap;
  @ViewChildren('markerElem') markerElements: QueryList<MapMarker>;
  markerConfigs: MapMarker[] = [];

  @ViewChild('selectDeveloperButtons') selectDeveloperButtons: ElementRef;
  cogedimProgramsHid = false;
  kaufmanbroadProgramsHid = false;

  constructor(private renderer: Renderer2,
              private router: Router,
              private cookieService: CookieService,
              private titleService: Title,
              private programService: ProgramService,
              private scrollService: ScrollService,
              private mapInitService: MapInitService) {
  }

  async ngOnInit() {
    this.titleService.setTitle(environment.title);

    this.programService.getProgramDateLots().subscribe(
      async programDateLots => {

        // set program's hided property
        for (const p of programDateLots) {
          p.hid = this.cookieIsProgramHided(p.program.programNumber);
          p.programCardHid = p.hid;
        }

        // move all hidden program to bottom
        const hidPrograms = [];
        for (let i = programDateLots.length - 1; i >= 0; i--) {
          const pdl = programDateLots[i];
          if (pdl.hid) {
            hidPrograms.push(programDateLots.splice(i, 1)[0]);
          }
        }
        programDateLots = programDateLots.concat(hidPrograms);

        this.programDateLots = programDateLots;

        // add google map marker
        for (const p of this.programDateLots) {
          this.markerConfigs.push({
            position: {
              lat: parseFloat(p.program.latitude),
              lng: parseFloat(p.program.longitude)
            },
            title: p.program.programName,
            options: {
              animation: google.maps.Animation.DROP,
              visible: !p.hid,
              icon: this.getMarkerIconUrlForDeveloper(p.program.developer)
            }
          } as MapMarker);
        }

        // request delivery info may take lots of time if the backend has no cache
        // so do this at the end of subscribe()
        for (const p of this.programDateLots) {
          // delivery info
          try {
            p.deliveryInfoHtml = await this.programService.getProgramPageDeliveryInfo(p.program.url).toPromise();
          } catch (e) {
            console.log('programService.getProgramPageDeliveryInfo(url) error, url = ' + p.program.url);
            console.log('flush and retry');
            await this.programService.flushUrl(p.program.url).toPromise();
            try {
              p.deliveryInfoHtml = await this.programService.getProgramPageDeliveryInfo(p.program.url).toPromise();
            } catch (e) {
              console.log('programService.getProgramPageDeliveryInfo(url) error, url = ' + p.program.url);
              console.log(e);
            }
          }
        }
      }
    );

    navigator.geolocation.getCurrentPosition(position => {
      this.center = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    });
  }

  ngAfterViewInit() {
    const transitLayer = new google.maps.TransitLayer();
    transitLayer.setMap(this.map._googleMap);

    this.programcards.changes.subscribe(
      res => this.programcards = res
    );

    this.markerElements.changes.subscribe(
      res => this.markerElements = res
    );

    this.rippleList.changes.subscribe(
      res => this.rippleList = res
    );

    // restore scroll position
    this.scrollService.scrollHome();

    // init google map
    this.mapInitService.initGoogleMap(this.map);

    this.map._googleMap.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(this.selectDeveloperButtons.nativeElement);
    this.selectDeveloperButtons.nativeElement.setAttribute('class', ''); // remove the d-none class
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    this.scrollService.recordHomePosition();
  }

  markerClick(marker: MapMarker) {
    // find index
    const index = this.programDateLots.findIndex((pdl) => pdl.program.programName === marker.getTitle());

    // scroll to card
    this.programcards.filter((item, i) => i === index)[0].nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    });

    // animate marker
    this.animateMarker(marker);

    // launch ripple on card
    const ripple = this.rippleList.filter((item, i) => i === index)[0];
    setTimeout(() => ripple.launch({centered: true}), 1000);
    setTimeout(() => ripple.launch({centered: true}), 1500);
    setTimeout(() => ripple.launch({centered: true}), 2000);
  }

  programCardLocationClick(programName) {
    this.animateMarker(this.markerElements.find(m => m.getTitle() === programName));

    // scroll to map if map is not in viewport
    const mapDiv = this.map._googleMap.getDiv();
    const rect = mapDiv.getBoundingClientRect();
    if (rect.bottom < 0 || rect.right < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) {
      mapDiv.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  hideProgramClick(pdl: ProgramDateLot) {
    pdl.hid = true;
    this.refreshMarkersAndProgramCardsVisibility();
    this.cookieSetProgramHided(pdl.program.programNumber, true);
  }

  unhideProgramClick(pdl: ProgramDateLot) {
    pdl.hid = false;
    this.refreshMarkersAndProgramCardsVisibility();
    this.cookieSetProgramHided(pdl.program.programNumber, false);
  }

  showAllHidedPrograms() {
    this.hideHidPrograms = !this.hideHidPrograms;
    this.refreshMarkersAndProgramCardsVisibility();
  }

  cogedimBtnOnclick() {
    this.cogedimProgramsHid = !this.cogedimProgramsHid;
    this.refreshMarkersAndProgramCardsVisibility();
  }

  kaufmanbroadBtnOnclick() {
    this.kaufmanbroadProgramsHid = !this.kaufmanbroadProgramsHid;
    this.refreshMarkersAndProgramCardsVisibility();
  }

  private refreshMarkersAndProgramCardsVisibility() {
    this.markerElements.forEach(
      (marker, index) => {
        const pdl = this.programDateLots[index];
        if (pdl.program.developer === RealEstateDeveloper.COGEDIM && this.cogedimProgramsHid) {
          marker._marker.setVisible(false);
          pdl.programCardHid = true;
        } else if (pdl.program.developer === RealEstateDeveloper.KAUFMANBROAD && this.kaufmanbroadProgramsHid) {
          marker._marker.setVisible(false);
          pdl.programCardHid = true;
        } else {
          marker._marker.setVisible(!this.hideHidPrograms ? true : !pdl.hid);
          pdl.programCardHid = !pdl.hid ? false : this.hideHidPrograms;
        }
      }
    );
  }

  private animateMarker(marker: MapMarker) {
    this.map.panTo(marker.getPosition());
    this.map._googleMap.setZoom(13);
    marker._marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker._marker.setAnimation(null), 1500);
  }

  private cookieIsProgramHided(programNumber: string) {
    if (this.cookieService.check(this.hidProgramsCookieName)) {
      const cookieStr = this.cookieService.get(this.hidProgramsCookieName);
      const hidePrograms = JSON.parse(cookieStr) as string[];
      return hidePrograms.indexOf(programNumber) >= 0;
    } else {
      return false;
    }
  }

  private cookieSetProgramHided(programNumber: string, setHided: boolean) {
    // read cookie
    let hidedPrograms: string[];
    if (this.cookieService.check(this.hidProgramsCookieName)) {
      const cookieStr = this.cookieService.get(this.hidProgramsCookieName);
      hidedPrograms = JSON.parse(cookieStr) as string[];
    } else {
      hidedPrograms = [];
    }

    if (setHided) {
      // hide program
      if (hidedPrograms.indexOf(programNumber) === -1) {
        hidedPrograms.push(programNumber);
      }
    } else {
      // unhide program
      const index = hidedPrograms.indexOf(programNumber);
      if (index >= 0) {
        hidedPrograms.splice(index, 1);
      }
    }

    // save
    this.cookieService.set(this.hidProgramsCookieName, JSON.stringify(hidedPrograms), 10 * 365, '/');
  }

  private getMarkerIconUrlForDeveloper(d: RealEstateDeveloper) {
    if (d === RealEstateDeveloper.COGEDIM) {
      return 'https://mt.google.com/vt/icon/text=C&psize=16&ax=49&ay=55&font=fonts/arialuni_t.ttf&color=ff330000&name=assets/icons/spotlight/spotlight_pin_v2_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v2-1-small.png,assets/icons/spotlight/spotlight_pin_v2_accent-1-small.png&highlight=ff000000,ea4335,ffffff&scale=1';
    } else if (d === RealEstateDeveloper.KAUFMANBROAD) {
      return 'https://mt.google.com/vt/icon/text=K&psize=16&ax=49&ay=55&font=fonts/arialuni_t.ttf&color=ff330000&name=assets/icons/spotlight/spotlight_pin_v2_shadow-1-small.png,assets/icons/spotlight/spotlight_pin_v2-1-small.png,assets/icons/spotlight/spotlight_pin_v2_accent-1-small.png&highlight=ff000000,ea4335,ffffff&scale=1';
    } else {
      return null;
    }

  }
}
