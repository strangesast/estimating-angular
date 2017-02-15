import { Component, OnInit, OnChanges } from '@angular/core';
import { AbstractControl, ValidatorFn, FormBuilder, FormGroup } from '@angular/forms';

import { SearchService } from '../../services/search.service';
import { DataService } from '../../services/data.service';

import { Subscription, Observable, Subject, BehaviorSubject } from 'rxjs';

const PART_TYPES = [
  'ActuatorCatalog',
  'CameraCatalog',
  'ComputerCatalog',
  'ControllerCatalog',
  'DamperCatalog',
  'KitCatalog',
  'NetControllerCatalog',
  'PanelCatalog',
  'SoftwareCatalog',
  'TransformerCatalog',
  'ValveCatalog',
  'VavCatalog'
]

const PART_KINDS = [
  'ACKIT',
  'ACT',
  'ADA',
  'ADAA',
  'ADAM',
  'ADAS',
  'AED',
  'AFS',
  'AI',
  'AIRCOMP',
  'AIRDRY',
  'ALL',
  'ALM',
  'ANT',
  'AQUA',
  'ASD',
  'ASVR',
  'AUD',
  'AV',
  'AVLV',
  'B',
  'BA',
  'BAC',
  'BC',
  'BIAS',
  'BIT',
  'BK',
  'BLPH',
  'BLR',
  'BND',
  'BOX',
  'BP',
  'BPO',
  'BREAKER',
  'BS',
  'BT',
  'BTU',
  'BUSH',
  'CA',
  'CAB',
  'CAM',
  'CAMKIT',
  'Case',
  'CB',
  'CBL',
  'CBM',
  'CHIP',
  'CHR',
  'CIM',
  'CLAMP',
  'CLK',
  'CLKIT',
  'CMND',
  'CMX',
  'CO',
  'CO2',
  'CO2S',
  'COM',
  'COND',
  'CONN',
  'CONT',
  'CR',
  'CRD',
  'CSM',
  'CSS',
  'CT',
  'DA',
  'DAC',
  'DB',
  'DC',
  'DCU',
  'DCX',
  'DEMO',
  'DEW',
  'DH',
  'DIAL',
  'DIN',
  'DISCOUNT',
  'DISP',
  'DIU',
  'DMP',
  'DMPACC',
  'DPS',
  'DPT',
  'DPTACC',
  'DR',
  'DRAIN',
  'DRVI',
  'DSC',
  'DSD',
  'DVR',
  'DVX',
  'DWC',
  'E-FUNC',
  'EL',
  'ELH',
  'EMX',
  'ENC',
  'ENCODE',
  'EP',
  'EPT',
  'ES',
  'ESS',
  'EST2',
  'EST3',
  'EXT',
  'FAAP',
  'FACP',
  'FB',
  'FBRP',
  'FDS',
  'FG',
  'FILTER',
  'FIRE',
  'FLO',
  'FLOAT',
  'FOAP',
  'FOEH',
  'FOG',
  'FOR',
  'FOT',
  'FP',
  'FPP',
  'FS',
  'FT',
  'FUSE',
  'GAS',
  'GATE',
  'GB',
  'GRD',
  'GW',
  'H-FUNC',
  'HD',
  'HHL',
  'HI',
  'HOA',
  'HPS',
  'HRN',
  'HS',
  'HTCO',
  'HTR',
  'HTSK',
  'HUM',
  'HW',
  'IBC',
  'IC',
  'ICM',
  'ID',
  'IDCP',
  'IDLC',
  'IM',
  'IN',
  'INC',
  'IND',
  'INFI',
  'INST',
  'INT',
  'IO',
  'IPCAM',
  'IPVD',
  'IR',
  'ISO',
  'IT',
  'IVC',
  'KB',
  'KEY',
  'KP',
  'KS',
  'KT',
  'KVM',
  'KYB',
  'LABEL',
  'LAMP',
  'LBM',
  'LCU',
  'LCX',
  'LD',
  'LED',
  'LENS',
  'LGH',
  'LIGHT',
  'LO',
  'LOCK',
  'LTCO',
  'LTS',
  'LTU',
  'M',
  'MAG',
  'MANI',
  'Mbus',
  'MC',
  'MCPKIT',
  'MD',
  'MDH',
  'MDR',
  'MDREX',
  'MET',
  'MF',
  'MIC',
  'ML',
  'MNT',
  'MOD',
  'MODBUS',
  'MODEM',
  'MON',
  'MOTOR',
  'MOV',
  'MTDR',
  'MTP',
  'MTR',
  'MTRACC',
  'MUKIT',
  'NAS',
  'NCU',
  'NET',
  'NIC',
  'NOP',
  'NVR',
  'NVS',
  'NVT',
  'OCC',
  'ODC',
  'OHMC',
  'OIL',
  'OM',
  'ORP',
  'OUT',
  'OXY',
  'P',
  'PART',
  'PB',
  'PBP',
  'PBREX',
  'PC',
  'PCU',
  'PD',
  'PDB',
  'PDM',
  'PDU',
  'PE',
  'PH',
  'PHL',
  'PHOTO',
  'PI',
  'PLC',
  'PLS',
  'PLT',
  'PM',
  'PMS',
  'PN',
  'PNL',
  'POE',
  'POT',
  'PP',
  'PR',
  'PRB',
  'PRT',
  'PRV',
  'PS',
  'PT',
  'PTZ',
  'PW',
  'PWP',
  'QP',
  'QUAD',
  'QUOTE',
  'RAM',
  'RCA',
  'RDR',
  'RECEIV',
  'RECP',
  'REPEAT',
  'RES',
  'REX',
  'RH',
  'RHL',
  'RI',
  'RLY',
  'RTR',
  'S',
  'S-FUNC',
  'SAN',
  'SASH',
  'SCBA',
  'SCNR',
  'SCSI',
  'SCU',
  'SCX',
  'SD',
  'SER',
  'SERVER',
  'SF',
  'SGN',
  'SHUNT',
  'SIG',
  'SIGN',
  'SIM',
  'SIR',
  'SLI',
  'SMK',
  'SMON',
  'SOL',
  'SPD',
  'SPKR',
  'SRV',
  'STAR',
  'STB',
  'STEAM',
  'STORAGE',
  'SUR',
  'SURC',
  'SW',
  'SWITCH',
  'SX',
  'T',
  'TAB',
  'TAG',
  'TAP',
  'TB',
  'TCX',
  'TD',
  'TE',
  'TECH',
  'TG',
  'THS',
  'TMPR',
  'TOOL',
  'TR',
  'TRANS',
  'TRAY',
  'TT',
  'TUKIT',
  'UPG',
  'UPGKIT',
  'UPS',
  'V',
  'VAMP',
  'vau',
  'VAV',
  'VCR',
  'VDIST',
  'VLV',
  'VLVACC',
  'VM',
  'VO',
  'VOL',
  'VP',
  'VS',
  'VSD',
  'WAP',
  'WAR',
  'WD',
  'WEL',
  'WELL',
  'WIRE',
  'WRC',
  'WRT',
  'WS',
  'wt',
  'WTR',
  'XDT',
  'XMUX',
  'XR',
  'XX',
  'XXXX',
  'ZPS'
];

function inArrayValidator(arr: string[]): ValidatorFn {
  return (control: AbstractControl) => {
    let kind = control.value
    console.log(arr.indexOf(kind));
    return arr.indexOf(kind) == -1 ? { inArrayValidator: true } : null;
  };
}

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['../../styles/general.less', './workspace.component.less']
})
export class WorkspaceComponent implements OnInit {
  results = new Subject();
  defaults = new Subject();

  kinds = PART_KINDS;
  types = PART_TYPES;
  collections;

  advancedSearchVisible: boolean = false;

  treeConfig = {
    properties: ['name']
  };

  searchForm: FormGroup;
  searchFormSubscription: Subscription;

  searchFocused: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(private searchService: SearchService, private formBuilder: FormBuilder, private db: DataService) { }

  async ngOnInit() {
    let db = this.db;
    this.collections = await db.collections.toArray();
    console.log('collections', this.collections);

    this.searchForm = this.formBuilder.group({
      query: '',
      elementType: ''
    });

    this.initForm(this.searchForm);
  }

  initForm(formGroup) {
    if (this.searchFormSubscription) this.searchFormSubscription.unsubscribe();

    let changes = formGroup.valueChanges;

    this.searchService.searchSubject(changes).subscribe(x => console.log('out', x));

    let onReset = changes.map(({elementType}) => elementType).startWith(formGroup.value.elementType).distinctUntilChanged().skip(1).take(1).subscribe(elementType => {
      let group: any = {
        query: this.searchForm && this.searchForm.value.query || '',
        elementType
      };
      if (elementType == '') {

      } else if (elementType == 'catalog') {
        group.attributes = this.formBuilder.group({
          kind: ['', inArrayValidator(this.kinds)],
          type: ['', inArrayValidator(this.types)],
          manufacturer: '',
          active: true
        });

      } else if (elementType == 'folder') {
        group.attributes = this.formBuilder.group({
          type: '',
          collection: ['', inArrayValidator(this.collections)],
        });

      } else if (elementType == 'component') {
        group.attributes = this.formBuilder.group({
          collection: ['', inArrayValidator(this.collections)],
        });

      }
      this.searchForm = this.formBuilder.group(group);
      this.initForm(this.searchForm);
    });

    let s = changes.debounceTime(100).startWith(formGroup.value);

    s.catch(err => {
      console.log('err', err);
      return Observable.never();
    }).subscribe();
    
    this.searchFormSubscription = s.switchMap(({query}) => {
      if(query) {
        return this.searchService.search(query);
      } else {
        return this.searchService.results;
      }
    }).subscribe(this.results);
  }

  resetForm() {
    this.searchForm = this.formBuilder.group({
      query: this.searchForm && this.searchForm.value.query || '',
      elementType: ''
    });
    this.initForm(this.searchForm);
  }

  ngOnChanges(changes) {}

}
