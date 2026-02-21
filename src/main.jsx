import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00f6ff'
        },
        secondary: {
            main: '#ff2bd6'
        },
        success: {
            main: '#39ff14'
        },
        background: {
            default: '#090312',
            paper: '#130822'
        },
        text: {
            primary: '#ecf6ff',
            secondary: '#b7c7db'
        }
    },
    typography: {
        fontFamily: 'Rajdhani, sans-serif',
        h1: { fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em' },
        h2: { fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.07em' },
        h3: { fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.06em' },
        h4: { fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em' },
        h5: { fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.04em' },
        h6: { fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.03em' }
    },
    shape: {
        borderRadius: 12
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundImage: `
                      radial-gradient(circle at 12% 18%, rgba(0, 246, 255, 0.18), transparent 30%),
                      radial-gradient(circle at 84% 9%, rgba(255, 43, 214, 0.22), transparent 26%),
                      radial-gradient(circle at 50% 82%, rgba(57, 255, 20, 0.12), transparent 34%),
                      linear-gradient(180deg, #130822 0%, #090312 100%)
                    `
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'linear-gradient(145deg, rgba(19, 8, 34, 0.92), rgba(10, 5, 22, 0.94))',
                    border: '1px solid rgba(0, 246, 255, 0.25)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 14px 28px rgba(0,0,0,0.45)'
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    border: '1px solid rgba(0, 246, 255, 0.3)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.45)'
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 700
                },
                containedPrimary: {
                    boxShadow: '0 0 12px rgba(0, 246, 255, 0.4)'
                },
                containedSecondary: {
                    boxShadow: '0 0 12px rgba(255, 43, 214, 0.4)'
                }
            }
        },
        MuiPaginationItem: {
            styleOverrides: {
                root: {
                    color: '#e9f6ff',
                    border: '1px solid rgba(0, 246, 255, 0.45)',
                    backgroundColor: 'rgba(9, 3, 18, 0.82)',
                    fontWeight: 700,
                    '&.Mui-selected': {
                        backgroundColor: '#00f6ff',
                        color: '#090312',
                        boxShadow: '0 0 14px rgba(0, 246, 255, 0.7)'
                    }
                },
                text: {
                    '&:hover': {
                        backgroundColor: 'rgba(0, 246, 255, 0.14)'
                    }
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 700
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'linear-gradient(90deg, rgba(9,3,18,0.95), rgba(19,8,34,0.95))',
                    borderBottom: '1px solid rgba(0, 246, 255, 0.35)'
                }
            }
        }
    }
})

createRoot(document.getElementById('root')).render(
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </ThemeProvider>
)
