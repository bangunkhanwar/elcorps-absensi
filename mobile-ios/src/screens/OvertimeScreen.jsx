import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, FileText, CheckCircle, XCircle, Timer, Award, History } from 'lucide-react';
import { overtimeAPI } from '../services/api';
import { useModal } from '../context/ModalContext';
import { useNotifications } from '../hooks/useNotifications';
import Header from '../components/Header';
import dayjs from 'dayjs';

const OvertimeScreen = () => {
    const navigate = useNavigate();
    const { refresh: refreshNotifications } = useNotifications();
    const { showSuccess, showError, showConfirmation } = useModal();

    const [activeTab, setActiveTab] = useState('form'); // 'form' | 'balance' | 'approval'
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'));
    const [jamMulai, setJamMulai] = useState('17:00');
    const [jamSelesai, setJamSelesai] = useState('19:00');
    const [keterangan, setKeterangan] = useState('');

    // Data State
    const [balance, setBalance] = useState(null);
    const [myOvertime, setMyOvertime] = useState([]);
    const [teamApprovals, setTeamApprovals] = useState([]);
    const [isSupervisor, setIsSupervisor] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [balanceRes, myOvertimeRes, teamRes] = await Promise.all([
                overtimeAPI.getDayOffBalance(),
                overtimeAPI.getMyOvertime(),
                overtimeAPI.getTeamApprovals()
            ]);

            if (balanceRes.success) setBalance(balanceRes.data);
            if (myOvertimeRes.success) setMyOvertime(myOvertimeRes.data);
            if (teamRes.success) {
                setTeamApprovals(teamRes.data);
                setIsSupervisor(teamRes.isSupervisor);
            }
        } catch (error) {
            console.error('Error fetching overtime data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!tanggal || !jamMulai || !jamSelesai || !keterangan) {
            return showError('Harap isi semua field');
        }

        setLoading(true);
        try {
            const res = await overtimeAPI.apply({
                tanggal,
                jam_mulai: jamMulai,
                jam_selesai: jamSelesai,
                keterangan
            });

            if (res.success) {
                showSuccess('Pengajuan lembur berhasil dikirim');
                setKeterangan('');
                fetchData();
                refreshNotifications();
            }
        } catch (error) {
            showError(error.response?.data?.error || 'Gagal mengajukan lembur');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (lembur_id, action) => {
        showConfirmation(
            'Konfirmasi',
            `Yakin ingin ${action === 'approved' ? 'menyetujui' : 'menolak'} lembur ini?`,
            async () => {
                try {
                    const res = await overtimeAPI.action({ lembur_id, action });
                    if (res.success) {
                        showSuccess(`Berhasil di-${action}`);
                        fetchData();
                        refreshNotifications();
                    }
                } catch (error) {
                    showError('Gagal memproses aksi');
                }
            }
        );
    };

    const handleClaimDayOff = async () => {
        showConfirmation(
            'Klaim Day Off',
            'Anda akan menggunakan 8 jam akumulasi lembur untuk 1 hari off. Lanjutkan?',
            async () => {
                try {
                    const res = await overtimeAPI.claimDayOff({ tanggal: dayjs().add(1, 'day').format('YYYY-MM-DD') });
                    if (res.success) {
                        showSuccess('Day off berhasil diklaim!');
                        fetchData();
                    }
                } catch (error) {
                    showError(error.response?.data?.error || 'Gagal klaim day off');
                }
            }
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="sticky top-0 z-40">
                <div className="bg-primary py-4 px-4 rounded-b-3xl shadow-lg">
                    <div className="flex items-center">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                            <ArrowLeft className="text-white" size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Lembur & Day Off</h1>
                            <p className="text-white/80 text-sm mt-1">{user?.nama}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white flex p-1 m-4 rounded-2xl shadow-sm gap-1 border border-gray-100">
                    <button onClick={() => setActiveTab('form')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'form' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Form
                    </button>
                    <button onClick={() => setActiveTab('balance')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'balance' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Saldo
                    </button>
                    {isSupervisor && (
                        <button onClick={() => setActiveTab('approval')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'approval' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                            Approval
                        </button>
                    )}
                </div>
            </div>

            <div className="px-4">
                {activeTab === 'form' && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-slide-up">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                                <Timer size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-800">Form Lembur</h2>
                                <p className="text-gray-500 text-xs">Ajukan lembur kerja Anda</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Lembur</label>
                                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition font-medium" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Mulai</label>
                                    <input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Selesai</label>
                                    <input type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition font-medium" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Keterangan / Pekerjaan</label>
                                <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Apa yang dikerjakan saat lembur?" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition min-h-[100px] font-medium" />
                            </div>

                            <button onClick={handleSubmit} disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {loading ? 'Memproses...' : <>Kirim Pengajuan <CheckCircle size={20} /></>}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'balance' && (
                    <div className="space-y-6 animate-slide-up">
                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-100 relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-emerald-100 font-bold mb-1">Total Akumulasi Lembur</h3>
                                <div className="text-4xl font-black mb-4">
                                    {balance?.total_jam_lembur || 0} <span className="text-sm font-medium">Jam</span>
                                </div>
                                
                                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-md border border-white/20">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold">Hari Off Tersedia:</span>
                                        <span className="text-2xl font-black">{balance?.hari_off_tersedia || 0} Hari</span>
                                    </div>
                                    <p className="text-[10px] text-emerald-50 leading-tight">Setiap 8 jam lembur approved dapat ditukarkan dengan 1 hari off.</p>
                                </div>

                                {balance?.hari_off_tersedia > 0 && (
                                    <button onClick={handleClaimDayOff} className="w-full mt-4 bg-white text-emerald-600 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition">
                                        Klaim Day Off Sekarang
                                    </button>
                                )}
                            </div>
                            <Award className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                        </div>

                        {/* Recent History */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <History size={20} className="text-gray-400" />
                                <h3 className="font-black text-gray-800">Riwayat Pengajuan</h3>
                            </div>
                            
                            <div className="space-y-3">
                                {myOvertime.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400 text-sm italic">Belum ada riwayat lembur</div>
                                ) : (
                                    myOvertime.map(item => (
                                        <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase">{dayjs(item.tanggal).format('DD MMM YYYY')}</span>
                                                    <h4 className="font-bold text-gray-800">{item.jam_mulai} - {item.jam_selesai}</h4>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                    item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                                                    item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-1 italic">"{item.keterangan || 'Tanpa keterangan'}"</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'approval' && (
                    <div className="space-y-4 animate-slide-up">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <h3 className="font-black text-gray-800">Menunggu Persetujuan</h3>
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs font-bold">{teamApprovals.filter(a => a.status === 'pending').length} Baru</span>
                        </div>

                        {teamApprovals.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="text-gray-300" size={32} />
                                </div>
                                <p className="text-gray-400 font-bold">Semua pengajuan telah diproses</p>
                            </div>
                        ) : (
                            teamApprovals.map(item => (
                                <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                                                {item.nama?.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-800 leading-tight">{item.nama}</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{item.nama_jabatan || 'Staff'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase block">{dayjs(item.tanggal).format('DD MMM YYYY')}</span>
                                            <span className="text-sm font-black text-gray-800">{item.jam_mulai} - {item.jam_selesai}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-3 rounded-xl mb-4 text-xs text-gray-600 border border-gray-100 italic">
                                        "{item.keterangan || 'Tanpa keterangan'}"
                                    </div>

                                    {item.status === 'pending' ? (
                                        <div className="flex gap-3">
                                            <button onClick={() => handleAction(item.id, 'rejected')} className="flex-1 py-3 border-2 border-red-100 text-red-500 rounded-2xl font-bold text-sm hover:bg-red-50 transition">
                                                Tolak
                                            </button>
                                            <button onClick={() => handleAction(item.id, 'approved')} className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-50 transition">
                                                Setujui
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`w-full py-2 text-center rounded-xl font-black text-xs uppercase ${
                                            item.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            Telah di-{item.status}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OvertimeScreen;
