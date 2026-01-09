import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Search, Filter, RefreshCw, Calendar, User, Mail, Activity, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  email?: string;
  role?: string;
  ip?: string;
  action: string;
  details?: unknown;
  result: 'success' | 'error';
  message?: string;
  timestamp: string;
}

// Mapeo de acciones a nombres legibles
const actionLabels: Record<string, string> = {
  'auth.login.success': 'Inicio de sesión',
  'auth.login.failed': 'Login fallido',
  'auth.logout': 'Cierre de sesión',
  'auth.register.success': 'Registro exitoso',
  'auth.register.failed': 'Registro fallido',
  'auth.password.change': 'Cambio de contraseña',
  'profile.update': 'Actualización de perfil',
  'appointment.create': 'Cita creada',
  'appointment.cancel': 'Cita cancelada',
  'admin.settings.update': 'Config. actualizada',
};

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros mejorados
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setErrorMessage('La tabla de auditoría no está configurada.');
        } else if (error.code === 'PGRST301' || error.message?.includes('permission')) {
          setErrorMessage('No tienes permisos para ver los logs de auditoría.');
        } else {
          setErrorMessage('No se pudieron cargar los logs de auditoría.');
        }
        setLogs([]);
        setAllLogs([]);
        return;
      }

      // Convertir de snake_case a camelCase
      const convertedData = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        userId: row.user_id as string,
        email: row.email as string | undefined,
        role: row.role as string | undefined,
        ip: row.ip as string | undefined,
        action: row.action as string,
        details: row.details,
        result: row.result as 'success' | 'error',
        message: row.message as string | undefined,
        timestamp: row.timestamp as string
      })) as AuditLog[];

      setAllLogs(convertedData);
      setLogs(convertedData);
    } catch (err) {
      setErrorMessage('Error al conectar con la base de datos.');
      setLogs([]);
      setAllLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    let filtered = [...allLogs];

    // Filtro de búsqueda general (nombre, email, mensaje)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.email?.toLowerCase().includes(query) ||
        l.message?.toLowerCase().includes(query) ||
        l.userId?.toLowerCase().includes(query) ||
        l.action?.toLowerCase().includes(query)
      );
    }

    // Filtro por acción
    if (actionFilter) {
      filtered = filtered.filter(l => l.action === actionFilter);
    }

    // Filtro por resultado
    if (resultFilter) {
      filtered = filtered.filter(l => l.result === resultFilter);
    }

    // Filtro por rol
    if (roleFilter) {
      filtered = filtered.filter(l => l.role === roleFilter);
    }

    // Filtro por fecha desde
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(l => new Date(l.timestamp) >= fromDate);
    }

    // Filtro por fecha hasta
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(l => new Date(l.timestamp) <= toDate);
    }

    setLogs(filtered);
    setCurrentPage(1); // Resetear a página 1 cuando cambian los filtros
  }, [searchQuery, actionFilter, resultFilter, roleFilter, dateFrom, dateTo, allLogs]);

  // Obtener acciones únicas para el select
  const uniqueActions = [...new Set(allLogs.map(l => l.action).filter(Boolean))];
  const uniqueRoles = [...new Set(allLogs.map(l => l.role).filter(Boolean))];

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('');
    setResultFilter('');
    setRoleFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchQuery || actionFilter || resultFilter || roleFilter || dateFrom || dateTo;

  const formatAction = (action: string) => {
    return actionLabels[action] || action.replace(/\./g, ' ').replace(/_/g, ' ');
  };

  const formatRole = (role?: string) => {
    if (!role) return '-';
    const roleMap: Record<string, string> = {
      'patient': 'Paciente',
      'doctor': 'Doctor',
      'admin': 'Admin',
      'seller': 'Vendedor'
    };
    return roleMap[role] || role;
  };

  // Cálculos de paginación
  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLogs = logs.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Historial de Auditoría
            </CardTitle>
            <CardDescription>
              Registro de actividades del sistema ({logs.length} de {allLogs.length} registros)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" />
              Filtros
              {hasActiveFilters && <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">Activos</Badge>}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda principal */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, mensaje, usuario o acción..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros Avanzados</h4>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por fecha */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Fecha desde
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Fecha hasta
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Filtro por acción */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs">
                  <Activity className="h-3 w-3" />
                  Acción
                </Label>
                <select
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Todas las acciones</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{formatAction(action)}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por resultado */}
              <div className="space-y-2">
                <Label className="text-xs">Resultado</Label>
                <select
                  value={resultFilter}
                  onChange={e => setResultFilter(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="success">✅ Éxito</option>
                  <option value="error">❌ Error</option>
                </select>
              </div>

              {/* Filtro por rol */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs">
                  <User className="h-3 w-3" />
                  Rol
                </Label>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Todos los roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{formatRole(role)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Cargando logs...</p>
          </div>
        ) : errorMessage ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{errorMessage}</p>
            <p className="text-xs mt-2">Esta función requiere configuración adicional en la base de datos.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'No hay registros que coincidan con los filtros.' : 'No hay registros de auditoría.'}
            </p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-3 py-2 text-left font-medium">Fecha/Hora</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Rol</th>
                    <th className="px-3 py-2 text-left font-medium">Acción</th>
                    <th className="px-3 py-2 text-left font-medium">Resultado</th>
                    <th className="px-3 py-2 text-left font-medium">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map(log => (
                    <tr
                      key={log.id}
                      className={`border-b hover:bg-muted/50 ${log.result === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]" title={log.email}>
                            {log.email || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">
                          {formatRole(log.role)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{formatAction(log.action)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={log.result === 'error' ? 'destructive' : 'default'}
                          className={log.result === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}
                        >
                          {log.result === 'success' ? '✅ Éxito' : '❌ Error'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 max-w-xs">
                        <span className="truncate block" title={log.message}>
                          {log.message || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Controles de paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, logs.length)} de {logs.length} registros
                </div>
                <div className="flex items-center gap-1">
                  {/* Primera página */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>

                  {/* Página anterior */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Números de página */}
                  <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map((page, idx) => (
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(page as number)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>

                  {/* Página siguiente */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Última página */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}