import * as React from 'react';
import { IPaginador2Props } from './IPaginador2Props';
import { 
  IColumn 
  } from 'office-ui-fabric-react/lib/DetailsList';
import { SPHttpClient, SPHttpClientResponse} from '@microsoft/sp-http';
import Paging from '../Paging/Paging';
import './App.css'

export interface IViewAllItemsState {
  items?: any[];
  columns?:IColumn[];
  status?: string;
  currentPage?: number;
  itemCount?: number;
  pageSize?: number;
  total:any[]
}

export default class Paginador2 extends React.Component<IPaginador2Props, IViewAllItemsState> {
 
  constructor(props: IPaginador2Props){
    super(props);    
        
    this.state ={
      items:[],
      currentPage:1,
      pageSize: this.props.pageSize,
      total:[]
    };
     
    this.ConsultaInicial()           //Actualiza el count como parametro del paginador
    this.ActualizarPaginador = this.ActualizarPaginador.bind(this);
    this.ConsultaPaginas(this.props.pageSize, 2000)     //Inicializa la consulta a la biblioteca de páginas
  }


  public componentWillReceiveProps(nextProps: IPaginador2Props): void{   
  
    this.setState({
     pageSize: nextProps.pageSize
    });
     
    this.ConsultaPaginas(this.props.pageSize, 2000)
  }

  public render(): React.ReactElement<IPaginador2Props> {
    
    let {items} = this.state;   //Destructuración del estadoa actual de Items
   
    //Inicio Renderizado
    const elementos: JSX.Element[] = items.map((item: any, i: number): JSX.Element => {   //Recorre el primer elemeto del array, para mostrar la primera noticia
     
      return (
        <div className="col linea col-12 col-sm-6 col-lg-3">
            <div className="card h-100 sn-todas-las-noticas">
               <a href={item.FileRef}  target="_top" title="Agencia pública de empleo de Colombia" >
               <div className="imgnoti" dangerouslySetInnerHTML={{__html: item.PublishingRollupImage}}></div>
                      <div className="card-body">
                        <h6 className="card-title titulod">{item.Noticias_Titulo}</h6>
                      </div>
                 </a>
            </div>
        </div>
           );
        }
      );
    //Fin Renderizado
    return(
      <div className="container centralNoticias">
        <h5>{this.props.description}</h5>
        <div className="row">
            {elementos}
       <div className="container">    
         <div className="">
             <Paging 
                    totalItems={ this.state.itemCount }
                    itemsCountPerPage={ this.state.pageSize } 
                    onPageUpdate={ this.ActualizarPaginador } 
                    currentPage={ this.state.currentPage }/>
              </div>
            </div> 
         </div>
      </div>
    );
  }


//Recibe la pagina actual para hacer el calculo de donde tiene que iniciar la consulta
  private ActualizarPaginador(pageNumber: number) {
    
    var array = []   //Se guardan los ID recuperados de la consulta inicial
    this.state.total.forEach((item)=>{
      array.push(item.ID)
    })
    var tamanio = this.props.pageSize * pageNumber - this.props.pageSize -1   //Consulta la posición para iniciar la nueva consulta
    this.setState({
      currentPage: pageNumber,
    });
    this.ConsultaPaginas(this.props.pageSize,array[tamanio]);    //Se ejecuta la consulta para cada boton, despues de dar el click
  }


//Hace la consulta a la biblioteca de paginas filtrado por el tipo contenido de noticias, y devuelve el count q se le referencie
   public ConsultaPaginas(limite,tamanio){
     
  var datoInicial = tamanio ? tamanio : 2000
  const restAPI = `${this.props.context.pageContext.web.absoluteUrl}/_api/web/Lists/GetByTitle('Páginas')/RenderListDataAsStream`;
  this.props.context.spHttpClient.post(restAPI, SPHttpClient.configurations.v1, {
  body: JSON.stringify({
    parameters: {
      RenderOptions: 2,
      ViewXml: `<View>
              <RowLimit>`+limite+`</RowLimit>
                  <Query>
                    <Where>
                        <And>
                            <Eq>
                              <FieldRef Name='ContentType' />
                            <Value Type='Computed'>Noticias</Value>
                            </Eq>
                              <And>
                                <Eq>
                                <FieldRef Name='PublishingPageLayout' />
                                <Value Type='URL'>/_catalogs/masterpage/Noticias.aspx</Value>
                                </Eq>  
                                  <Lt>
                                      <FieldRef Name='ID' />
                                      <Value Type='Counter'>`+datoInicial+`</Value>
                                  </Lt>
                              </And>
                         </And>
                     </Where>
                            <ViewFields>
                              <FieldRef Name="Title"/>
                              <FieldRef Name="PublishingRollupImage"/>
                              <FieldRef Name="FileRef"/>
                              <FieldRef Name="Noticias_Titulo"/>
                              <FieldRef Name="Noticias_Descripcion"/>
                              </ViewFields> 
                            <OrderBy>
                             <FieldRef Name='ID' Ascending='False' />
                           </OrderBy>
                    </Query>
              </View>
             `
      }
    })
  })
  .then((response: SPHttpClientResponse) => response.json())
  .then((response: any) => {
    if (response && response.Row && response.Row.length > 0) {
      this.setState({
        items: response.Row,
        //columns: _buildColumns(response.value),
        status: `Showing items ${(this.state.currentPage - 1)*this.props.pageSize +1} - ${(this.state.currentPage -1) * this.props.pageSize + response.Row.length} of ${this.state.itemCount}`
      }); 
      }
    });
  }


//Muestra el count de los elementos a trabajar en el paginador
public ConsultaInicial(){
    
 const restAPI = `${this.props.context.pageContext.web.absoluteUrl}/_api/web/Lists/GetByTitle('Páginas')/RenderListDataAsStream`;
 this.props.context.spHttpClient.post(restAPI, SPHttpClient.configurations.v1, {
 body: JSON.stringify({
   parameters: {
     RenderOptions: 2,
     ViewXml: `<View>
             <RowLimit>2000</RowLimit>
                 <Query>
                    <Where>
                    <Eq>
                        <FieldRef Name='ContentType' />
                        <Value Type='Computed'>Noticias</Value>
                    </Eq>
                    <Eq>
                    <FieldRef Name='PublishingPageLayout' />
                    <Value Type='URL'>/_catalogs/masterpage/Noticias.aspx</Value>
                    </Eq>  
                  </Where>
                        <ViewFields>
                             <FieldRef Name="ID"/>
                        </ViewFields> 
                            <OrderBy>
                                <FieldRef Name='ID' Ascending='False' />
                            </OrderBy>
                   </Query>
                  </View>
            `
     }
   })
 })
 .then((response: SPHttpClientResponse) => response.json())
 .then((response: any) => {
   if (response && response.Row && response.Row.length > 0) {
     this.setState({
      total: response.Row,
      itemCount: response.Row.length
       }); 
     }
   });
 }



}
