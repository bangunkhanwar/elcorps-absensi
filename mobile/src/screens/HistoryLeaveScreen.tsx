import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    StatusBar as RNStatusBar,
    Platform,
    StyleSheet,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';


export default function AttendanceScreen({ navigation }: any) {
    const [selectedFilter, setSelectedFilter] = useState('semua');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [user, setUser] = useState<any>(null);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data and attendance history
    useEffect(() => {
        loadUserDataAndAttendance();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadUserDataAndAttendance();
        });
        return unsubscribe;
    }, [navigation]);

    const loadUserDataAndAttendance = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const userObj = JSON.parse(userData);
                setUser(userObj);
                await fetchAttendanceHistory(userObj.id);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceHistory = async (userId: number) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const serverIP = await AsyncStorage.getItem('server_ip') || '10.1.10.236';

            console.log('Fetching leave history from server:', serverIP);

            // Menggunakan endpoint /my-leaves sesuai backend
            const response = await fetch(
                `http://${serverIP}:5000/api/leave/my-leaves`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('DEBUG DATA API:', JSON.stringify(result, null, 2));

            // Pastikan kita mengambil array dari properti 'leaves'
            const leavesData = result.leaves || [];

            // Filter berdasarkan bulan dan tahun yang dipilih
            const filteredData = leavesData.filter((item: any) => {
                const startDate = new Date(item.start_date);
                const endDate = new Date(item.end_date);

                // Cek apakah ada overlap dengan bulan dan tahun yang dipilih
                const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
                const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);

                return (
                    (startDate >= selectedMonthStart && startDate <= selectedMonthEnd) ||
                    (endDate >= selectedMonthStart && endDate <= selectedMonthEnd) ||
                    (startDate <= selectedMonthStart && endDate >= selectedMonthEnd)
                );
            });

            // Sort by date (newest first)
            filteredData.sort((a: any, b: any) => {
                return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
            });

            setAttendanceData(filteredData);
        } catch (error: any) {
            console.error('Error fetching leave data:', error);
            Alert.alert('Error', 'Gagal mengambil data izin: ' + error.message);
        }
    };

    // Tambahkan fungsi calculateStatus
    const calculateStatus = (jenisIzin: string, status: string) => {
        const jenis = jenisIzin?.toLowerCase?.() || '';
        const statusIzin = status?.toLowerCase?.() || '';

        // Prioritaskan status persetujuan
        if (statusIzin === 'pending') return 'Menunggu';
        if (statusIzin === 'rejected') return 'Ditolak';
        if (statusIzin === 'approved') {
            // Jika disetujui, tampilkan jenis izin
            if (jenis === 'sakit') return 'Sakit';
            if (jenis === 'izin') return 'Izin';
            if (jenis === 'cuti') return 'Cuti';
            if (jenis === 'lainnya') return 'Lainnya';
            return jenis.charAt(0).toUpperCase() + jenis.slice(1);
        }

        return 'Menunggu';
    };

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const years = [2023, 2024, 2025, 2026, 2027];

    const filterOptions = [
        { value: 'semua', label: 'Semua Status' },
        { value: 'pending', label: 'Menunggu' },
        { value: 'approved', label: 'Disetujui' },
        { value: 'rejected', label: 'Ditolak' },
        { value: 'sakit', label: 'Sakit' },
        { value: 'izin', label: 'Izin' },
        { value: 'cuti', label: 'Cuti' },
        { value: 'lainnya', label: 'Lainnya' },
    ];

    // Update filteredData dengan calculateStatus
    const filteredData = attendanceData.filter((item: any) => {
        const status = calculateStatus(item.jenis_izin, item.status);

        if (selectedFilter === 'semua') return true;

        // Filter berdasarkan status persetujuan
        if (selectedFilter === 'pending') return item.status?.toLowerCase() === 'pending';
        if (selectedFilter === 'approved') return item.status?.toLowerCase() === 'approved';
        if (selectedFilter === 'rejected') return item.status?.toLowerCase() === 'rejected';

        // Filter berdasarkan jenis izin
        if (selectedFilter === 'sakit') return item.jenis_izin?.toLowerCase() === 'sakit';
        if (selectedFilter === 'izin') return item.jenis_izin?.toLowerCase() === 'izin';
        if (selectedFilter === 'cuti') return item.jenis_izin?.toLowerCase() === 'cuti';
        if (selectedFilter === 'lainnya') return item.jenis_izin?.toLowerCase() === 'lainnya';

        return false;
    });

    // Fungsi format tanggal untuk tampilan yang lebih baik
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('id-ID', { month: 'long' });
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day} ${month} ${year}, ${hours}:${minutes}`;
    };

    const formatShortDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('id-ID', { month: 'short' });
        const year = date.getFullYear();

        return `${day} ${month} ${year}`;
    };

    const handleOpenAttachment = async (lampiran: string) => {
        try {
            if (lampiran.startsWith('http')) {
                const supported = await Linking.canOpenURL(lampiran);
                if (supported) {
                    await Linking.openURL(lampiran);
                } else {
                    Alert.alert('Error', 'Tidak dapat membuka file');
                }
            } else {
                Alert.alert('Lampiran', `Path file: ${lampiran}`);
            }
        } catch (error) {
            console.error('Error opening attachment:', error);
            Alert.alert('Error', 'Gagal membuka lampiran');
        }
    };

    const formatDateRange = (startDateStr: string, endDateStr: string) => {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        const startDay = startDate.getDate();
        const startMonth = startDate.toLocaleDateString('id-ID', { month: 'long' });
        const startYear = startDate.getFullYear();

        const endDay = endDate.getDate();
        const endMonth = endDate.toLocaleDateString('id-ID', { month: 'long' });
        const endYear = endDate.getFullYear();

        if (startDate.toDateString() === endDate.toDateString()) {
            // Same day
            return `${startDay} ${startMonth} ${startYear}`;
        } else if (startMonth === endMonth && startYear === endYear) {
            // Same month and year
            return `${startDay} - ${endDay} ${endMonth} ${endYear}`;
        } else if (startYear === endYear) {
            // Same year, different month
            return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
        } else {
            // Different year
            return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
        }
    };

    const formatSingleDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('id-ID', { month: 'long' });
        const year = date.getFullYear();
        const weekday = date.toLocaleDateString('id-ID', { weekday: 'long' });

        return `${weekday}, ${day} ${month} ${year}`;
    };



    const formatDate = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Jika tanggal sama, tampilkan satu tanggal
        if (start.toDateString() === end.toDateString()) {
            const options: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return start.toLocaleDateString('id-ID', options);
        }

        // Jika beda tanggal, tampilkan range
        const startOptions: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'long',
        };
        const endOptions: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };

        return `${start.toLocaleDateString('id-ID', startOptions)} - ${end.toLocaleDateString('id-ID', endOptions)}`;
    };

    const formatTime = (timeString: string | null) => {
        if (!timeString) return '-';
        const time = new Date(`2000-01-01T${timeString}`);
        return time.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Update getStatusColor untuk menangani Sakit, Izin, dan Lainnya
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Izin': return 'bg-blue-100 text-blue-800';
            case 'Sakit': return 'bg-purple-100 text-purple-800';
            case 'Cuti': return 'bg-green-100 text-green-800';
            case 'Ditolak': return 'bg-red-100 text-red-800';
            case 'Menunggu': return 'bg-yellow-100 text-yellow-800';
            case 'Disetujui': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <View style={styles.container}>
            {/* Status Bar untuk iOS */}
            {Platform.OS === 'ios' && (
                <View style={styles.iosStatusBar} />
            )}

            {/* Status Bar untuk Android */}
            {Platform.OS === 'android' && (
                <RNStatusBar backgroundColor="#25a298" barStyle="light-content" />
            )}

            {/* SafeAreaView untuk konten */}
            <SafeAreaView style={styles.safeArea}
                edges={
                    Platform.OS === 'ios'
                        ? ['left', 'right', 'bottom'] // iOS: hanya kiri, kanan, bawah
                        : ['top', 'left', 'right', 'bottom'] // Android: semua sisi
                }>
                {/* Header */}
                <View className="bg-primary py-4 px-4 rounded-b-3xl shadow-lg">
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-10 h-10 bg-white/20 rounded-xl items-center justify-center mr-4"
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-white">Riwayat Izin</Text>
                            <Text className="text-white/80 text-sm mt-1">
                                {user?.nama}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Filter Section */}
                <View className="bg-white p-4 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-semibold text-gray-800">Filter Data</Text>
                        <TouchableOpacity
                            onPress={() => setShowFilterModal(true)}
                            className="flex-row items-center bg-primary rounded-lg px-4 py-2"
                        >
                            <Ionicons name="filter" size={16} color="white" />
                            <Text className="text-white ml-2 font-semibold">Filter</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Selected Period */}
                    <View className="bg-blue-50 rounded-lg p-3">
                        <Text className="text-blue-800 text-center font-medium">
                            Periode: {months[selectedMonth]} {selectedYear}
                        </Text>
                    </View>
                </View>

                {/* Attendance List */}
                <ScrollView className="flex-1 p-4 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
                    {loading ? (
                        <View className="items-center justify-center py-12">
                            <Ionicons name="refresh" size={64} color="#9CA3AF" />
                            <Text className="text-gray-500 text-lg font-semibold mt-4">
                                Memuat data...
                            </Text>
                        </View>
                    ) : (
                        <View className="space-y-3">
                            {filteredData.map((item: any) => {
                                const status = calculateStatus(item.jenis_izin, item.status);
                                const startDate = new Date(item.start_date);
                                const endDate = new Date(item.end_date);
                                const isSameDay = startDate.toDateString() === endDate.toDateString();
                                const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                // Format tanggal untuk baris 1 (Tanggal diajukan)
                                const formattedCreatedAt = new Date(item.created_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                // Format tanggal untuk baris 3 (Tanggal awal - tanggal akhir)
                                const formatShortDate = (dateString: string) => {
                                    const date = new Date(dateString);
                                    return date.toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    });
                                };

                                const formattedDateRange = isSameDay
                                    ? formatShortDate(item.start_date)
                                    : `${formatShortDate(item.start_date)} - ${formatShortDate(item.end_date)}`;

                                return (
                                    <View key={item.id} className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-gray-100">
                                        {/* Baris 1: Jenis Izin - Status */}
                                        <View className="mb-2">
                                            <View className="flex-row justify-between items-center">
                                                <View className="flex-row items-center flex-1">
                                                    <Ionicons
                                                        name={
                                                            item.jenis_izin === 'sakit' ? 'medkit-outline' :
                                                                item.jenis_izin === 'izin' ? 'document-text-outline' :
                                                                    item.jenis_izin === 'cuti' ? 'sunny-outline' :
                                                                        'ellipsis-horizontal-outline'
                                                        }
                                                        size={16}
                                                        color="#4B5563"
                                                    />
                                                    <Text className="text-gray-800 font-semibold text-base ml-2">
                                                        {item.jenis_izin ? item.jenis_izin.charAt(0).toUpperCase() + item.jenis_izin.slice(1) : '-'}
                                                    </Text>
                                                </View>

                                                <View className={`px-3 py-1 rounded-full ${item.status === 'approved' ? 'bg-green-100' :
                                                    item.status === 'rejected' ? 'bg-red-100' :
                                                        'bg-yellow-100'
                                                    }`}>
                                                    <Text className={`font-semibold text-xs ${item.status === 'approved' ? 'text-green-800' :
                                                        item.status === 'rejected' ? 'text-red-800' :
                                                            'text-yellow-800'
                                                        }`}>
                                                        {item.status === 'approved' ? 'DISETUJUI' :
                                                            item.status === 'rejected' ? 'DITOLAK' :
                                                                'MENUNGGU'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        
                                        {/* Baris 2: Tanggal diajukan */}
                                        <View className="mb-2">
                                            <View className="flex-row items-center">
                                                <Text className="text-gray-600 text-xs">Diajukan:</Text>
                                            </View>
                                            <Text className="text-gray-800 font-medium text-sm mt-0.5">
                                                {formattedCreatedAt}
                                            </Text>
                                        </View>

                                        

                                        {/* Baris 3: Tanggal awal - tanggal akhir */}
                                        <View className="mb-2">
                                            <View className="flex-row items-center">
                                                <Text className="text-gray-600 text-xs">Periode Izin:</Text>
                                            </View>
                                            <View className="flex-row items-center mt-0.5">
                                                <Text className="text-gray-800 font-medium text-sm">
                                                    {formattedDateRange}
                                                </Text>
                                                {!isSameDay && (
                                                    <View className="ml-2 bg-blue-50 px-2 py-0.5 rounded-full">
                                                        <Text className="text-blue-700 text-xs font-medium">
                                                            {durationDays} hari
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {/* Baris 4: Keterangan */}
                                        {item.keterangan && (
                                            <View className="mb-2">
                                                <View className="flex-row items-center">
                                                    <Text className="text-gray-600 text-xs">Keterangan:</Text>
                                                </View>
                                                <Text className="text-gray-800 text-sm mt-0.5 bg-gray-50 p-2 rounded-lg">
                                                    {item.keterangan}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Baris 5: Lampiran file */}
                                        {item.lampiran && (
                                            <View>
                                                <View className="flex-row items-center">
                                                    <Text className="text-gray-600 text-xs">Lampiran:</Text>
                                                </View>
                                                <TouchableOpacity
                                                    className="flex-row items-center mt-0.5 p-2 bg-blue-50 rounded-lg"
                                                    onPress={() => handleOpenAttachment(item.lampiran)}
                                                >
                                                    <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                                                    <Text className="text-blue-600 font-medium text-sm ml-2 flex-1">
                                                        {item.lampiran.split('/').pop() || 'Lihat File'}
                                                    </Text>
                                                    <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Empty State */}
                    {!loading && filteredData.length === 0 && (
                        <View className="items-center justify-center py-12 px-4">
                            <Ionicons name="file-tray-outline" size={64} color="#D1D5DB" />
                            <Text className="text-gray-500 text-lg font-semibold mt-4 text-center">
                                {selectedFilter === 'semua'
                                    ? `Tidak ada riwayat izin pada ${months[selectedMonth]} ${selectedYear}`
                                    : `Tidak ada data dengan filter "${filterOptions.find(f => f.value === selectedFilter)?.label}"`
                                }
                            </Text>
                            <Text className="text-gray-400 text-center mt-2 text-sm">
                                Semua pengajuan izin akan ditampilkan di sini
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showFilterModal}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 max-h-3/4">
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-bold text-gray-800">Filter Riwayat</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Month Selection */}
                        <View className="mb-6">
                            <Text className="text-lg font-semibold text-gray-800 mb-3">Bulan</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row space-x-2">
                                    {months.map((month, index) => (
                                        <TouchableOpacity
                                            key={month}
                                            onPress={() => setSelectedMonth(index)}
                                            className={`px-4 py-3 rounded-lg ${selectedMonth === index
                                                ? 'bg-primary'
                                                : 'bg-gray-100'
                                                }`}
                                        >
                                            <Text className={
                                                selectedMonth === index
                                                    ? 'text-white font-semibold'
                                                    : 'text-gray-700'
                                            }>
                                                {month}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Year Selection */}
                        <View className="mb-6">
                            <Text className="text-lg font-semibold text-gray-800 mb-3">Tahun</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row space-x-2">
                                    {years.map((year) => (
                                        <TouchableOpacity
                                            key={year}
                                            onPress={() => setSelectedYear(year)}
                                            className={`px-4 py-3 rounded-lg ${selectedYear === year
                                                ? 'bg-primary'
                                                : 'bg-gray-100'
                                                }`}
                                        >
                                            <Text className={
                                                selectedYear === year
                                                    ? 'text-white font-semibold'
                                                    : 'text-gray-700'
                                            }>
                                                {year}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Status Filter */}
                        <View className="mb-6">
                            <Text className="text-lg font-semibold text-gray-800 mb-3">Status</Text>
                            <View className="flex-row flex-wrap -mx-1">
                                {filterOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setSelectedFilter(option.value)}
                                        className={`mx-1 mb-2 px-4 py-3 rounded-lg flex-1 min-w-[45%] ${selectedFilter === option.value
                                            ? 'bg-primary'
                                            : 'bg-gray-100'
                                            }`}
                                    >
                                        <Text className={
                                            selectedFilter === option.value
                                                ? 'text-white font-semibold text-center'
                                                : 'text-gray-700 text-center'
                                        }>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row space-x-3">
                            <TouchableOpacity
                                className="flex-1 bg-gray-200 rounded-xl py-4"
                                onPress={() => {
                                    setSelectedFilter('semua');
                                    setSelectedMonth(new Date().getMonth());
                                    setSelectedYear(new Date().getFullYear());
                                }}
                            >
                                <Text className="text-gray-700 text-center font-semibold">
                                    Reset
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-primary rounded-xl py-4"
                                onPress={() => setShowFilterModal(false)}
                            >
                                <Text className="text-white text-center font-semibold">
                                    Terapkan
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white', // Background utama putih
    },
    iosStatusBar: {
        backgroundColor: '#25a298', // Warna primary (hijau) untuk status bar iOS
        height: Platform.OS === 'ios' ? Constants.statusBarHeight : 0,
        width: '100%',
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'white', // Background putih untuk konten di bawah status bar
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    lampiranButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
        marginTop: 4,
    },
    itemContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
});