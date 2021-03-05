import { SPHttpClient } from '@microsoft/sp-http';
import { DisplayMode } from '@microsoft/sp-core-library';
import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IPaginador2Props {
  description: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  listName: string;
  needsConfiguration:boolean;
  configureWebPart: () => void;
  displayMode: DisplayMode;
  pageSize: number;
  selectedColumns: any[];
  context:WebPartContext;
  eleccion:string;
}
