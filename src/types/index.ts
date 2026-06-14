export interface CrimeRecord {
  id: string;
  regiao: string;
  ano: string;
  mes: string;
  municipio: string;
  categoria_crime: string;
  tipo_crime: string;
  ocorrencias: number;
  variacao_mensal: number;
}
