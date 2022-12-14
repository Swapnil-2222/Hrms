import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import dayjs from 'dayjs/esm';

import { isPresent } from 'app/core/util/operators';
import { ApplicationConfigService } from 'app/core/config/application-config.service';
import { createRequestOption } from 'app/core/request/request-util';
import { IDocuments, NewDocuments } from '../documents.model';

export type PartialUpdateDocuments = Partial<IDocuments> & Pick<IDocuments, 'id'>;

type RestOf<T extends IDocuments | NewDocuments> = Omit<T, 'issuedDate' | 'validUpTo' | 'lastModified' | 'createdOn'> & {
  issuedDate?: string | null;
  validUpTo?: string | null;
  lastModified?: string | null;
  createdOn?: string | null;
};

export type RestDocuments = RestOf<IDocuments>;

export type NewRestDocuments = RestOf<NewDocuments>;

export type PartialUpdateRestDocuments = RestOf<PartialUpdateDocuments>;

export type EntityResponseType = HttpResponse<IDocuments>;
export type EntityArrayResponseType = HttpResponse<IDocuments[]>;

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/documents');

  constructor(protected http: HttpClient, protected applicationConfigService: ApplicationConfigService) {}

  create(documents: NewDocuments): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(documents);
    return this.http
      .post<RestDocuments>(this.resourceUrl, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  update(documents: IDocuments): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(documents);
    return this.http
      .put<RestDocuments>(`${this.resourceUrl}/${this.getDocumentsIdentifier(documents)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  partialUpdate(documents: PartialUpdateDocuments): Observable<EntityResponseType> {
    const copy = this.convertDateFromClient(documents);
    return this.http
      .patch<RestDocuments>(`${this.resourceUrl}/${this.getDocumentsIdentifier(documents)}`, copy, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  find(id: number): Observable<EntityResponseType> {
    return this.http
      .get<RestDocuments>(`${this.resourceUrl}/${id}`, { observe: 'response' })
      .pipe(map(res => this.convertResponseFromServer(res)));
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http
      .get<RestDocuments[]>(this.resourceUrl, { params: options, observe: 'response' })
      .pipe(map(res => this.convertResponseArrayFromServer(res)));
  }

  delete(id: number): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  getDocumentsIdentifier(documents: Pick<IDocuments, 'id'>): number {
    return documents.id;
  }

  compareDocuments(o1: Pick<IDocuments, 'id'> | null, o2: Pick<IDocuments, 'id'> | null): boolean {
    return o1 && o2 ? this.getDocumentsIdentifier(o1) === this.getDocumentsIdentifier(o2) : o1 === o2;
  }

  addDocumentsToCollectionIfMissing<Type extends Pick<IDocuments, 'id'>>(
    documentsCollection: Type[],
    ...documentsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const documents: Type[] = documentsToCheck.filter(isPresent);
    if (documents.length > 0) {
      const documentsCollectionIdentifiers = documentsCollection.map(documentsItem => this.getDocumentsIdentifier(documentsItem)!);
      const documentsToAdd = documents.filter(documentsItem => {
        const documentsIdentifier = this.getDocumentsIdentifier(documentsItem);
        if (documentsCollectionIdentifiers.includes(documentsIdentifier)) {
          return false;
        }
        documentsCollectionIdentifiers.push(documentsIdentifier);
        return true;
      });
      return [...documentsToAdd, ...documentsCollection];
    }
    return documentsCollection;
  }

  protected convertDateFromClient<T extends IDocuments | NewDocuments | PartialUpdateDocuments>(documents: T): RestOf<T> {
    return {
      ...documents,
      issuedDate: documents.issuedDate?.toJSON() ?? null,
      validUpTo: documents.validUpTo?.toJSON() ?? null,
      lastModified: documents.lastModified?.toJSON() ?? null,
      createdOn: documents.createdOn?.toJSON() ?? null,
    };
  }

  protected convertDateFromServer(restDocuments: RestDocuments): IDocuments {
    return {
      ...restDocuments,
      issuedDate: restDocuments.issuedDate ? dayjs(restDocuments.issuedDate) : undefined,
      validUpTo: restDocuments.validUpTo ? dayjs(restDocuments.validUpTo) : undefined,
      lastModified: restDocuments.lastModified ? dayjs(restDocuments.lastModified) : undefined,
      createdOn: restDocuments.createdOn ? dayjs(restDocuments.createdOn) : undefined,
    };
  }

  protected convertResponseFromServer(res: HttpResponse<RestDocuments>): HttpResponse<IDocuments> {
    return res.clone({
      body: res.body ? this.convertDateFromServer(res.body) : null,
    });
  }

  protected convertResponseArrayFromServer(res: HttpResponse<RestDocuments[]>): HttpResponse<IDocuments[]> {
    return res.clone({
      body: res.body ? res.body.map(item => this.convertDateFromServer(item)) : null,
    });
  }
}
