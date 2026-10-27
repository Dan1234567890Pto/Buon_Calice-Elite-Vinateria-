import { useState } from 'react';
import ClienteView from './components/Clientes/ClienteView';
import EmpleadoView from './components/Empleado/EmpleadoView';
import './App.css';

export default function App() {
    const [vistaActual, setVistaActual] = useState('cliente'); // 'cliente' | 'empleado'

    return (
        <div className="app-container">
            {/* Barra de navegación superior para alternar vistas (Modo Pruebas / Demostración) */}
            <header className="app-navigation-bar">
                <div className="app-navigation-content">
                    <span className="app-brand-badge">⚡ Élite Vinatería Portal</span>
                    <div className="app-switcher-buttons">
                        <button
                            onClick={() => setVistaActual('cliente')}
                            className={`app-switch-btn ${vistaActual === 'cliente' ? 'active' : ''}`}
                        >
                            🛒 Vista Cliente
                        </button>
                        <button
                            onClick={() => setVistaActual('empleado')}
                            className={`app-switch-btn ${vistaActual === 'empleado' ? 'active' : ''}`}
                        >
                            💼 Vista Empleado
                        </button>
                    </div>
                </div>
            </header>

            {/* Renderizado condicional según la vista seleccionada */}
            <main className="app-main-content">
                {vistaActual === 'cliente' ? <ClienteView /> : <EmpleadoView />}
            </main>
        </div>
    );
}