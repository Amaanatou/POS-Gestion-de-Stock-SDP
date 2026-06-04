// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { login } from '../config/api';

export default function Login() {
  const { connecter }   = useAuth();
  const navigate        = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await login(data.email, data.mot_de_passe);
    setLoading(false);
    if (result.success) {
      connecter(result.token, result.utilisateur);
      toast.success(`Bienvenue ${result.utilisateur.prenom} !`);
      navigate('/dashboard');
    } else {
      toast.error(result.message || 'Erreur de connexion');
    }
  };

  return (
    <div className='min-h-screen bg-[#1E3A5F] flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md p-8'>
        {/* En-tête */}
        <div className='text-center mb-8'>
          <div className='w-16 h-16 bg-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-4'>
            <span className='text-white text-2xl font-bold'>SDP</span>
          </div>
          <h1 className='text-2xl font-bold text-gray-800'>Sen Digital Pulse</h1>
          <p className='text-gray-500 mt-1'>Gestion de Stock — Connexion</p>
        </div>
        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Adresse email
            </label>
            <input
              type='email'
              placeholder='admin@sdp.sn'
              {...register('email', { required: 'Email requis' })}
              className='w-full border border-gray-300 rounded-lg px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                         focus:border-transparent text-gray-800'
            />
            {errors.email && (
              <p className='text-red-500 text-xs mt-1'>{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Mot de passe
            </label>
            <input
              type='password'
              placeholder='••••••••'
              {...register('mot_de_passe', { required: 'Mot de passe requis' })}
              className='w-full border border-gray-300 rounded-lg px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-[#2196F3]
                         focus:border-transparent text-gray-800'
            />
            {errors.mot_de_passe && (
              <p className='text-red-500 text-xs mt-1'>{errors.mot_de_passe.message}</p>
            )}
          </div>
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50
                       text-white font-bold py-3 rounded-lg transition-colors
                       flex items-center justify-center gap-2'
          >
            {loading ? (
              <>
                <span className='animate-spin border-2 border-white border-t-transparent
                      rounded-full w-5 h-5 inline-block'></span>
                Connexion...
              </>
            ) : 'SE CONNECTER'}
          </button>
        </form>
      </div>
    </div>
  );
}
