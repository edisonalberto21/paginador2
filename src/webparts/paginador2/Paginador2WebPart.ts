import * as React from 'react';
import * as ReactDom from 'react-dom';
import {
  BaseClientSideWebPart,
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown,
  IPropertyPaneDropdownOption
} from '@microsoft/sp-webpart-base';

import * as strings from 'Paginador2WebPartStrings';
import Paginador2 from './components/Paginador2';
import { IPaginador2Props } from './components/IPaginador2Props';

export interface IPaginador2WebPartProps {
  description: string;
  listName: string;
  selectedIds: string[];
  selectedColumnsAndType: any[];
  pageSize: number;
}

export default class Paginador2WebPart extends BaseClientSideWebPart<IPaginador2WebPartProps> {
  private lists: IPropertyPaneDropdownOption[];
  private listsDropdownDisabled: boolean = true;
  public render(): void {
    const element: React.ReactElement<IPaginador2Props> = React.createElement(
      Paginador2,
      {
        description: this.properties.description,
        spHttpClient: this.context.spHttpClient,
        siteUrl: this.context.pageContext.web.absoluteUrl,
        listName: this.properties.listName,
        needsConfiguration: this.needsConfiguration(),
        configureWebPart: this.configureWebPart,
        displayMode: this.displayMode,
        selectedColumns: this.selectedColumns(),
        pageSize: this.properties.pageSize,
        context:this.context
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  private needsConfiguration(): boolean {
    return this.properties.listName === null ||
      this.properties.listName === undefined ||
      this.properties.listName.trim().length === 0 ||
      this.properties.selectedIds === null ||
      this.properties.selectedIds === undefined ||
      this.properties.selectedIds.length === 0;
  }

  private configureWebPart(): void {
    this.context.propertyPane.open();
  }

  private selectedColumns(): any[] {
    if(this.properties.selectedColumnsAndType === null ||
      this.properties.selectedColumnsAndType===undefined ||
      this.properties.selectedColumnsAndType.length === 0){
      return [];
      }
      else{
        return this.properties.selectedColumnsAndType.filter(obj => this.properties.selectedIds.indexOf(obj.key) !== -1);
      }
  }

  
  private validateTitle(value: string): string {
    
    if (value === null ||
      value.trim().length === 0) {
      return 'Este campo requiere información';
    }
   if (value.length > 100) {
      return 'Este campo no puede exceder los 100 caracteres';
    }
      return '';
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('description', {
                  label: 'Titulo',
                  onGetErrorMessage: this.validateTitle.bind(this)
                }),
                PropertyPaneDropdown('pageSize',{
                  label: strings.PageSizeFieldLabel,
                  options:[
                    {key: '4', text: '4'},
                    {key: '8', text: '8'},
                    {key: '12', text: '12'},
                    {key: '16', text: '16'},
                    ]
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
