// Attend que le HTML soit chargé pour exécuter le script
document.addEventListener('DOMContentLoaded', () => {

    // --- Classes (Modèles de données) ---

    class Carte {
        constructor(enseigne, rang) {
            this.enseigne = enseigne;
            this.rang = rang;
            this.valeur = this._getValeur();
            this.couleur_rb = this._getCouleurRB();
        }

        _getValeur() {
            if (['Valet', 'Dame', 'Roi'].includes(this.rang)) {
                return { 'Valet': 11, 'Dame': 12, 'Roi': 13 }[this.rang];
            }
            if (this.rang === 'As') {
                return 14;
            }
            return parseInt(this.rang);
        }

        _getCouleurRB() {
            return ['Coeur', 'Carreau'].includes(this.enseigne) ? 'Rouge' : 'Noir';
        }

        // Renvoie une représentation simple pour l'affichage
        toString() {
            return `${this.rang} de ${this.enseigne}`;
        }
    }

    class Paquet {
        constructor() {
            this.cartes = [];
            this._creerPaquet();
            this.melanger();
        }

        _creerPaquet() {
            const enseignes = ['Coeur', 'Carreau', 'Trèfle', 'Pique'];
            const rangs = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As'];
            this.cartes = enseignes.flatMap(e => rangs.map(r => new Carte(e, r)));
        }

        melanger() {
            // Algorithme de mélange Fisher-Yates
            for (let i = this.cartes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.cartes[i], this.cartes[j]] = [this.cartes[j], this.cartes[i]];
            }
            console.log("--- Le paquet a été mélangé ! ---");
        }

        piocher(nombre = 1) {
            let cartesPiochees = [];
            for (let i = 0; i < nombre; i++) {
                // On remélange s'il reste moins de 12 cartes (pour le Triple Osé José)
                if (this.cartes.length < 12) {
                    console.log("Pas assez de cartes, on remélange le paquet...");
                    this._creerPaquet();
                    this.melanger();
                }
                cartesPiochees.push(this.cartes.pop());
            }
            return cartesPiochees;
        }
    }

    // --- Classe principale du Jeu ---

    class JeuOseJose {
        constructor() {
            // État du jeu
            this.joueurs = [];
            this.indexJoueurActuel = 0;
            this.paquet = new Paquet();
            this.cartesPiocheesCeTour = [];
            this.aOse = false;

            // Éléments du DOM (interface)
            this.setupScreen = document.getElementById('setup-screen');
            this.gameScreen = document.getElementById('game-screen');
            
            // Setup
            this.numJoueursInput = document.getElementById('num-joueurs');
            this.nomsJoueursContainer = document.getElementById('noms-joueurs-container');
            this.btnCommencer = document.getElementById('btn-commencer');

            // Jeu
            this.nomJoueurActuelEl = document.getElementById('nom-joueur-actuel');
            this.compteCartesEl = document.getElementById('compte-cartes');
            this.statutOseEl = document.getElementById('statut-ose');
            this.cartesPrecedentesEl = document.getElementById('cartes-precedentes');
            this.cartesResultatEl = document.getElementById('cartes-resultat');
            this.messageTexteEl = document.getElementById('message-texte');
            this.btnRejouer = document.getElementById('btn-rejouer');
            this.parisZone = document.getElementById('paris-zone');
            this.btnArreter = document.getElementById('btn-arreter');
            
            // Modals
            this.joseModal = document.getElementById('jose-modal');
            this.btnJoseRouge = document.getElementById('btn-jose-rouge');
            this.btnJoseNoir = document.getElementById('btn-jose-noir');

            // Lier les événements
            this.lierEvenementsSetup();
            this.lierEvenementsJeu();
        }

        // --- 1. Phase de Configuration ---

        lierEvenementsSetup() {
            // Met à jour le nombre de champs "nom"
            this.numJoueursInput.addEventListener('change', () => this.majNomsInputs());
            // Commence la partie
            this.btnCommencer.addEventListener('click', () => this.commencerPartie());
            // Initialise les inputs au chargement
            this.majNomsInputs();
        }

        majNomsInputs() {
            const num = parseInt(this.numJoueursInput.value, 10);
            this.nomsJoueursContainer.innerHTML = '';
            for (let i = 0; i < num; i++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = `Nom du Joueur ${i + 1}`;
                input.className = 'nom-joueur-input';
                this.nomsJoueursContainer.appendChild(input);
            }
        }

        commencerPartie() {
            // Récupère les noms des joueurs
            const inputs = document.querySelectorAll('.nom-joueur-input');
            this.joueurs = Array.from(inputs).map(input => input.value || input.placeholder);
            
            if (this.joueurs.length === 0) return;

            // Cache l'écran de setup et montre l'écran de jeu
            this.setupScreen.classList.remove('active');
            this.gameScreen.classList.add('active');

            // Initialise le premier tour
            this.indexJoueurActuel = 0;
            this.demarrerTour();
        }

        // --- 2. Phase de Jeu ---

        lierEvenementsJeu() {
            // Clic sur un bouton de pari
            this.parisZone.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-pari')) {
                    const pari = e.target.dataset.pari;
                    this.gererPari(pari);
                }
            });

            // Clic sur "Arrêter"
            this.btnArreter.addEventListener('click', () => this.passerAuJoueurSuivant());

            // Clic sur "Rejouer" (après avoir perdu)
            this.btnRejouer.addEventListener('click', () => this.demarrerTour());

            // Clic sur le choix de couleur pour "José"
            this.btnJoseRouge.addEventListener('click', () => this.resoudrePariJose('Rouge'));
            this.btnJoseNoir.addEventListener('click', () => this.resoudrePariJose('Noir'));
        }

        demarrerTour() {
            // Réinitialise l'état du tour
            this.cartesPiocheesCeTour = [];
            this.aOse = false;
            
            // Réinitialise l'interface
            this.nomJoueurActuelEl.textContent = `C'est au tour de ${this.joueurs[this.indexJoueurActuel]} !`;
            this.cartesPrecedentesEl.innerHTML = '<h3>Cartes du tour :</h3>';
            this.cartesResultatEl.innerHTML = '<h3>Dernier tirage :</h3>';
            this.messageTexteEl.textContent = '';
            this.btnRejouer.classList.add('hidden');
            this.parisZone.classList.remove('hidden');

            this.mettreAJourInterface();
        }

        gererPari(pari) {
            // Cas spécial pour "José" qui demande une couleur
            if (pari === 'josé') {
                this.joseModal.classList.remove('hidden');
                return; // On attend que le joueur choisisse une couleur
            }

            // Pour tous les autres paris
            const { succes, cartesTirees } = this._resoudrePari(pari, null);
            this.finaliserPari(succes, cartesTirees, pari);
        }

        resoudrePariJose(couleurAnnoncee) {
            // Cache la pop-up
            this.joseModal.classList.add('hidden');
            
            // Résout le pari "José" maintenant qu'on a la couleur
            const { succes, cartesTirees } = this._resoudrePari('josé', couleurAnnoncee);
            this.finaliserPari(succes, cartesTirees, 'josé');
        }

        finaliserPari(succes, cartesTirees, pari) {
            // Affiche les cartes tirées
            this._afficherCartes(cartesTirees, this.cartesResultatEl);
            
            // Ajoute les cartes au total du tour
            this.cartesPiocheesCeTour.push(...cartesTirees);
            this._afficherCartes(this.cartesPiocheesCeTour, this.cartesPrecedentesEl, true);

            if (succes) {
                this._afficherMessage("...RÉUSSI !", true);
                
                // Met à jour le statut "Osé"
                if (['purple', 'josé', 'osé josé', 'double purple', 'triple purple', 'double osé josé', 'triple osé josé'].includes(pari)) {
                    this.aOse = true;
                }
                
            } else {
                // Le joueur a perdu
                const gorgees = this.cartesPiocheesCeTour.length;
                this._afficherMessage(`...RATÉ ! ${this.joueurs[this.indexJoueurActuel]} doit boire ${gorgees} gorgée(s).`, false);
                this.gererPerte();
            }
            
            // Met à jour les boutons, le statut "Osé", etc.
            this.mettreAJourInterface();
        }

        gererPerte() {
            // Le joueur a perdu, il ne peut plus parier
            this.parisZone.classList.add('hidden');
            this.btnArreter.classList.add('hidden');
            
            // Il doit cliquer pour rejouer (son tour recommence)
            this.btnRejouer.classList.remove('hidden');
        }

        passerAuJoueurSuivant() {
            // Le joueur s'arrête, on passe au suivant
            this.indexJoueurActuel = (this.indexJoueurActuel + 1) % this.joueurs.length;
            this._afficherMessage(`Tour suivant...`, true);
            
            // On utilise un petit délai pour que le joueur voie le message
            setTimeout(() => {
                this.demarrerTour();
            }, 1500);
        }

        // --- Logique de Résolution des Paris (le "moteur" du jeu) ---

       _resoudrePari(pari, extraData) {
            try {
                // --- Paris inchangés ---
                if (pari === 'rouge') {
                    const carte = this.paquet.piocher(1)[0];
                    return { succes: carte.couleur_rb === 'Rouge', cartesTirees: [carte] };
                }
                if (pari === 'noir') {
                    const carte = this.paquet.piocher(1)[0];
                    return { succes: carte.couleur_rb === 'Noir', cartesTirees: [carte] };
                }
                if (pari === 'plus') {
                    const prec = this.cartesPiocheesCeTour[this.cartesPiocheesCeTour.length - 1];
                    const carte = this.paquet.piocher(1)[0];
                    return { succes: carte.valeur > prec.valeur, cartesTirees: [carte] };
                }
                if (pari === 'moins') {
                    const prec = this.cartesPiocheesCeTour[this.cartesPiocheesCeTour.length - 1];
                    const carte = this.paquet.piocher(1)[0];
                    return { succes: carte.valeur < prec.valeur, cartesTirees: [carte] };
                }
                if (pari === 'intérieur' || pari === 'extérieur') {
                    const a = this.cartesPiocheesCeTour[this.cartesPiocheesCeTour.length - 1];
                    const b = this.cartesPiocheesCeTour[this.cartesPiocheesCeTour.length - 2];
                    const low = Math.min(a.valeur, b.valeur);
                    const high = Math.max(a.valeur, b.valeur);
                    const carte = this.paquet.piocher(1)[0];
                    let succes;
                    if (pari === 'intérieur') {
                        succes = carte.valeur > low && carte.valeur < high;
                    } else { // extérieur
                        succes = carte.valeur < low || carte.valeur > high;
                    }
                    return { succes: succes, cartesTirees: [carte] };
                }
                if (pari === 'purple') {
                    const cartes = this.paquet.piocher(2);
                    const succes = cartes[0].couleur_rb !== cartes[1].couleur_rb;
                    return { succes: succes, cartesTirees: cartes };
                }
                if (pari === 'josé') {
                    const cartes = this.paquet.piocher(3);
                    const succes_purple = cartes[0].couleur_rb !== cartes[1].couleur_rb;
                    const succes_couleur = cartes[2].couleur_rb === extraData;
                    return { succes: succes_purple && succes_couleur, cartesTirees: cartes };
                }
                if (pari === 'osé josé') {
                    const cartes = this.paquet.piocher(4);
                    const rouges = cartes.filter(c => c.couleur_rb === 'Rouge').length;
                    const succes = rouges === 1 || rouges === 3;
                    return { succes: succes, cartesTirees: cartes };
                }
                
                // --- MODIFIÉ : Logique des paris multiples ---

                if (pari === 'double purple') {
                    const cartes = this.paquet.piocher(4);
                    // On compte le total : 2 Rouges (et donc 2 Noires)
                    const rouges = cartes.filter(c => c.couleur_rb === 'Rouge').length;
                    const succes = rouges === 2;
                    return { succes: succes, cartesTirees: cartes };
                }

                if (pari === 'triple purple') {
                    const cartes = this.paquet.piocher(6);
                    // On compte le total : 3 Rouges (et donc 3 Noires)
                    const rouges = cartes.filter(c => c.couleur_rb === 'Rouge').length;
                    const succes = rouges === 3;
                    return { succes: succes, cartesTirees: cartes };
                }

                if (pari === 'double osé josé') {
                    const cartes = this.paquet.piocher(8);
                    // On compte le total : 2, 4, ou 6 Rouges
                    const rouges = cartes.filter(c => c.couleur_rb === 'Rouge').length;
                    const succes = rouges === 2 || rouges === 4 || rouges === 6;
                    return { succes: succes, cartesTirees: cartes };
                }

                if (pari === 'triple osé josé') {
                    const cartes = this.paquet.piocher(12);
                    // On compte le total : 3, 5, 7, ou 9 Rouges (on suit la logique)
                    const rouges = cartes.filter(c => c.couleur_rb === 'Rouge').length;
                    const succes = rouges === 3 || rouges === 5 || rouges === 7 || rouges === 9;
                    return { succes: succes, cartesTirees: cartes };
                }

            } catch (e) {
                console.error("Erreur lors de la résolution du pari:", e);
                return { succes: false, cartesTirees: [] }; // Sécurité
            }
            return { succes: false, cartesTirees: [] }; // Pari non reconnu
        }


        // --- Fonctions d'aide pour l'Interface ---

        mettreAJourInterface() {
            const numCartes = this.cartesPiocheesCeTour.length;
            
            // Met à jour le compteur de cartes
            this.compteCartesEl.textContent = `Cartes piochées ce tour : ${numCartes}`;
            
            // Met à jour le statut "Osé"
            this.statutOseEl.classList.toggle('hidden', !this.aOse);

            // Gère la visibilité des boutons
            document.querySelectorAll('#paris-tour2 button').forEach(btn => 
                btn.disabled = numCartes < 1
            );
            document.querySelectorAll('#paris-tour3 button').forEach(btn => 
                btn.disabled = numCartes < 2
            );
            
            // Le joueur peut-il s'arrêter ?
            // OUI, si il a 4 cartes OU PLUS, ET s'il a "Osé"
            const peutArreter = numCartes >= 4 && this.aOse;
            this.btnArreter.classList.toggle('hidden', !peutArreter);
        }

        _afficherCartes(cartes, elementCible, estHistorique = false) {
            // Gère le titre de la section
            const titre = estHistorique ? '<h3>Cartes du tour :</h3>' : '<h3>Dernier tirage :</h3>';
            elementCible.innerHTML = titre;
            
            // Crée et ajoute les éléments de carte
            cartes.forEach(carte => {
                const carteEl = document.createElement('div');
                carteEl.className = `carte ${carte.couleur_rb === 'Rouge' ? 'rouge' : 'noir'}`;
                
                const rangEl = document.createElement('strong');
                rangEl.textContent = carte.rang;
                
                const enseigneEl = document.createElement('span');
                enseigneEl.textContent = carte.enseigne;

                carteEl.appendChild(rangEl);
                carteEl.appendChild(enseigneEl);
                elementCible.appendChild(carteEl);
            });
        }

        _afficherMessage(texte, succes) {
            this.messageTexteEl.textContent = texte;
            this.messageTexteEl.className = succes ? 'succes' : 'echec';
        }
    }

    // --- Lancement du jeu ---
    const jeu = new JeuOseJose();

});