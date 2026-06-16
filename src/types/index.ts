export interface CrimeRecord {
  categoria_crime: string;
  mes: string;
  ano: string;
  ocorrencias: number;
  municipio: string;
  tipo_crime?: string;
  variacao_mensal?: number;
  id?: string;
}
