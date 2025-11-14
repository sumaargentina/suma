"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Doctor, AppSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Settings } from 'lucide-react';

export default function SpecialtiesCitiesPage() {
  const [doctorsData, setDoctorsData] = useState<Doctor[]>([]);
  const [settingsData, setSettingsData] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Obtener doctores
      const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
      const doctors = doctorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Doctor[];
      
      // Obtener configuración
      const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
      const settings = settingsDoc.exists() ? settingsDoc.data() as AppSettings : null;
      
      setDoctorsData(doctors);
      setSettingsData(settings);
      
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Obtener especialidades y ciudades únicas
  const doctorSpecialties = [...new Set(doctorsData.map(d => d.specialty).filter(Boolean))].sort();
  const doctorCities = [...new Set(doctorsData.map(d => d.city).filter(Boolean))].sort();
  
  const configSpecialties = settingsData?.specialties || [];
  const configCities = settingsData?.cities?.map(c => c.name) || [];
  
  const allSpecialties = [...new Set([...doctorSpecialties, ...configSpecialties])].sort();
  const allCities = [...new Set([...doctorCities, ...configCities])].sort();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Especialidades y Ciudades</h1>
          <p className="text-muted-foreground">
            Vista en tiempo real de especialidades y ciudades en el sistema
          </p>
        </div>
        <Button onClick={fetchData} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Especialidades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Especialidades en Uso
            </CardTitle>
            <CardDescription>
              Especialidades donde hay doctores registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allSpecialties.length > 0 ? (
              <div className="grid gap-2">
                {allSpecialties.map((specialty, index) => {
                  const doctorCount = doctorsData.filter(d => d.specialty === specialty).length;
                  const isFromConfig = configSpecialties.includes(specialty);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-900">{specialty}</span>
                        {isFromConfig && (
                          <Badge variant="outline" className="text-xs">
                            <Settings className="h-3 w-3 mr-1" />
                            Configurada
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {doctorCount} doctor(es)
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay especialidades en uso actualmente</p>
            )}
          </CardContent>
        </Card>

        {/* Ciudades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Ciudades en Uso
            </CardTitle>
            <CardDescription>
              Ciudades donde hay doctores registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allCities.length > 0 ? (
              <div className="grid gap-2">
                {allCities.map((city, index) => {
                  const doctorCount = doctorsData.filter(d => d.city === city).length;
                  const isFromConfig = configCities.includes(city);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-900">{city}</span>
                        {isFromConfig && (
                          <Badge variant="outline" className="text-xs">
                            <Settings className="h-3 w-3 mr-1" />
                            Configurada
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {doctorCount} doctor(es)
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay ciudades en uso actualmente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuración del Sistema */}
      {settingsData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración del Sistema
            </CardTitle>
            <CardDescription>
              Datos configurados en settings/main
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Especialidades Configuradas ({configSpecialties.length})</h4>
                {configSpecialties.length > 0 ? (
                  <div className="space-y-1">
                    {configSpecialties.map((specialty, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {specialty}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay especialidades configuradas</p>
                )}
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Ciudades Configuradas ({configCities.length})</h4>
                {configCities.length > 0 ? (
                  <div className="space-y-1">
                    {configCities.map((city, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {city}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay ciudades configuradas</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Estadísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{doctorsData.length}</div>
              <div className="text-sm text-muted-foreground">Total Doctores</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{allSpecialties.length}</div>
              <div className="text-sm text-muted-foreground">Especialidades</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{allCities.length}</div>
              <div className="text-sm text-muted-foreground">Ciudades</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {configSpecialties.length + configCities.length}
              </div>
              <div className="text-sm text-muted-foreground">Configuradas</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}