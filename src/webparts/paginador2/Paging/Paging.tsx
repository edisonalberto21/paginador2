import * as React from "react";
import {IPagingProps} from "./IPagingProps";
import Pagination from "react-js-pagination";
import styles from './Paging.module.scss';

export default class Paging extends React.Component<IPagingProps, null> {

    constructor(props: IPagingProps) {
        super(props);

        this._onPageUpdate = this._onPageUpdate.bind(this);
    }

    public render(): React.ReactElement<IPagingProps> {

        return(
            <div className={`${styles.paginationContainer}`}>
                <div className={`${styles.searchWp__paginationContainer__pagination}`}>
                <Pagination
                    activePage={this.props.currentPage}
                    firstPageText={<i className="ms-Icon ms-Icon--ChevronLeft" aria-hidden="true">Ir al Primero</i>}
                    lastPageText={<i className="ms-Icon ms-Icon--ChevronRight" aria-hidden="true">Ir al último</i>}
                    prevPageText={<i className="ms-Icon ms-Icon--ChevronLeft" aria-hidden="true">Anterior</i>}
                    nextPageText={<i className="ms-Icon ms-Icon--ChevronRight" aria-hidden="true">Siguiente</i>}
                    activeLinkClass={ `${styles.active}` }
                    itemsCountPerPage={ this.props.itemsCountPerPage }
                    totalItemsCount={ this.props.totalItems }
                    pageRangeDisplayed={10}
                    onChange={this.props.onPageUpdate}
                />
                </div>
            </div>
        );
    }

    private _onPageUpdate(pageNumber: number): void {
        this.props.onPageUpdate(pageNumber);
    }
}
