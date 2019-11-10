import {Component, OnInit} from '@angular/core';
import {ProgramService} from '../service/program.service';
import {ActivatedRoute, ParamMap} from '@angular/router';
import {map, switchMap} from 'rxjs/operators';
import {ProgramDateLot} from '../model/program-date-lot';
import {Sort} from '@angular/material';
import {Lot} from '../model/lot';
import {SafeHtml, Title} from "@angular/platform-browser";

@Component({
  selector: 'app-program',
  templateUrl: './program.component.html',
  styleUrls: ['./program.component.css']
})
export class ProgramComponent implements OnInit {

  programDateLot: ProgramDateLot;

  dataSource: Lot[];
  originalData: Lot[];
  displayedColumns: string[] = ['lotNumber', 'surface', 'floor', 'price', 'pdf'];

  dates: string[];
  selectedDate: string;
  selectedDateLotCount: string;
  hasNextDate: boolean;
  hasPreviousDate: boolean;

  injectSalesInfo: SafeHtml;
  injectMainInfo: SafeHtml;

  constructor(
    private route: ActivatedRoute,
    private titleService: Title,
    private programService: ProgramService) {
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap(
          (params: ParamMap) =>
            this.programService.getProgramDateLots().pipe(
              map(
                programDateLots =>
                  programDateLots.find(p => p.program.programNumber === params.get('programNumber'))
              ))
        ))
      .subscribe(
        async res => {
          // program data
          this.programDateLot = res;
          this.dates = Array.from(res.dateMap.keys());
          this.selectedDate = this.dates[this.dates.length - 1];
          this.originalData = res.dateMap.get(this.selectedDate).slice();
          this.dataSource = this.originalData.slice();
          this.selectedDateLotCount = this.dataSource.length + ' lot' + (this.dataSource.length > 1 ? 's' : '');

          this.hasPreviousDate = true;
          this.hasNextDate = false;

          // page title
          this.titleService.setTitle(this.programDateLot.program.programName);

          // inject main info
          this.injectMainInfo = await this.programService.getProgramPageMainInfo(this.programDateLot.program.url).toPromise();

          // inject sales info
          this.injectSalesInfo = await this.programService.getProgramPageSalesInfo(this.programDateLot.program.url).toPromise();
        }
      );
  }

  sortData(sort: Sort) {
    const data = this.dataSource.slice();
    if (!sort.active || sort.direction === '') {
      this.dataSource = data;
      return;
    }

    this.dataSource = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'lotNumber':
          return compare(+a.lotNumber, +b.lotNumber, isAsc);
        case 'surface':
          return compare(surfaceToNumber(a.surface), surfaceToNumber(b.surface), isAsc);
        case 'floor':
          return compare(floorToNumber(a.floor), floorToNumber(b.floor), isAsc);
        case 'price':
          return compare(priceToNumber(a.price), priceToNumber(b.price), isAsc);
        default:
          return 0;
      }
    });
  }

  changeDate(plusOne: boolean) {
    let index = this.dates.indexOf(this.selectedDate);
    index += plusOne ? 1 : -1;
    if (index >= 0 && index < this.dates.length) {
      this.selectedDate = this.dates[index];
      this.originalData = this.programDateLot.dateMap.get(this.selectedDate).slice();
      this.dataSource = this.originalData.slice();
      this.selectedDateLotCount = this.dataSource.length + ' lot' + (this.dataSource.length > 1 ? 's' : '');
    }

    this.hasPreviousDate = index > 0;
    this.hasNextDate = index < (this.dates.length - 1);
  }
}

function compare(a: number, b: number, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

function surfaceToNumber(p: string): number {
  return +p.replace(/ /g, '').replace('m2', '');
}

function priceToNumber(p: string): number {
  return +p.replace(/ /g, '').replace('€', '');
}

function floorToNumber(s: string) {
  if (s.toUpperCase() === 'RDC') {
    return 0;
  } else {
    const firstDigit = Number(s.substring(0, 1));
    const secondDigit = Number(s.substring(1, 2));

    let floor = 0;
    if (!isNaN(firstDigit)) {
      floor += firstDigit;
      if (!isNaN(secondDigit)) {
        floor += secondDigit;
      }
      return floor;
    } else {
      return -1;
    }
  }
}
